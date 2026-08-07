-- Módulo "Agenda" — recordatorios personales del residente.
--
-- Deliberadamente mínima: título + fecha + hora, con notificación push
-- obligatoria 30 minutos antes (no configurable, no se puede desactivar).
-- "hora" es obligatoria porque sin ella no hay forma de calcular el aviso.

create table public.agenda_recordatorios (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  creado_por uuid not null references public.residentes(id) on delete cascade,

  titulo text not null,
  fecha date not null,
  hora time not null,

  estado text not null default 'pendiente' check (estado in ('pendiente', 'realizado', 'vencido', 'cancelado')),
  completado_en timestamptz,

  -- El cron (AgendaReminderProcessorService) marca estos dos al enviar el
  -- push, siempre 30 minutos antes de fecha+hora (offset fijo, ver
  -- RECORDATORIO_OFFSET_MINUTOS en AgendaTypes.ts) — nunca configurable.
  notificacion_enviada boolean not null default false,
  notificacion_enviada_en timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agenda_residente_fecha on public.agenda_recordatorios (residente_id, fecha);
create index idx_agenda_pendientes on public.agenda_recordatorios (estado, fecha, hora) where estado = 'pendiente';
create index idx_agenda_organizacion on public.agenda_recordatorios (organizacion_id);

create trigger trg_agenda_recordatorios_updated_at
before update on public.agenda_recordatorios
for each row execute function public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────────
-- Solo política de SELECT: todo write pasa por el backend con la service-role
-- key (bypassa RLS) — mismo criterio que el módulo Hablemos.
alter table public.agenda_recordatorios enable row level security;

create policy "agenda_recordatorios_select_own" on public.agenda_recordatorios for select
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));
