-- Módulo "Agenda" — recordatorios personales del residente, con repetición,
-- prioridad, audio+transcripción y notificaciones push.
--
-- Tabla única y denormalizada (mismo criterio que `mensajes_hablemos`: el
-- audio va directo en la fila, no en una tabla aparte) — la recurrencia se
-- resuelve materializando una fila por ocurrencia (mismo enfoque que
-- `actividades`/`ActivitiesAdminService.generarOcurrencias`), no calculando
-- RRULE en cada lectura.

create table public.agenda_recordatorios (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes(id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  creado_por uuid not null references public.residentes(id) on delete cascade,

  titulo text not null,
  descripcion text,
  fecha date not null,
  hora time,                          -- null = "todo el día"

  prioridad text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'urgente')),
  color text,                         -- override manual (hex); si es null se usa el color de la prioridad
  icono text,                         -- emoji opcional

  estado text not null default 'pendiente' check (estado in ('pendiente', 'realizado', 'vencido', 'cancelado')),
  completado_en timestamptz,

  tipo_contenido text not null default 'texto' check (tipo_contenido in ('texto', 'audio', 'ambos')),
  audio_url text,
  audio_transcripcion text,
  audio_duracion_segundos integer,
  constraint agenda_recordatorios_contenido_check check (
    titulo is not null and (
      tipo_contenido = 'texto'
      or (tipo_contenido in ('audio', 'ambos') and audio_url is not null)
    )
  ),

  -- null = sin notificación (default). Minutos de anticipación: 0/10/30/60/1440.
  recordatorio_offset_minutos integer check (recordatorio_offset_minutos is null or recordatorio_offset_minutos >= 0),
  notificacion_enviada boolean not null default false,

  origen text not null default 'manual' check (origen in ('manual', 'rapido', 'horarios')),
  actividad_origen_id uuid references public.actividades(id) on delete set null,

  -- Recurrencia: cada ocurrencia es una fila propia, agrupadas por serie_id.
  serie_id uuid,
  es_plantilla boolean not null default false,
  recurrencia_tipo text not null default 'ninguna' check (recurrencia_tipo in
    ('ninguna', 'diaria', 'laborables', 'semanal', 'mensual', 'anual', 'personalizada')),
  recurrencia_dias_semana int[],      -- solo para 'personalizada' (0=domingo … 6=sábado)
  recurrencia_hasta date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agenda_residente_fecha on public.agenda_recordatorios (residente_id, fecha);
create index idx_agenda_serie on public.agenda_recordatorios (serie_id) where serie_id is not null;
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

-- ─── Storage: audio de recordatorios ───────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agenda-audio', 'agenda-audio', true, 10485760, array['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a', 'audio/wav', 'audio/webm'])
on conflict (id) do nothing;

create policy "agenda_audio_public_read" on storage.objects for select
  using (bucket_id = 'agenda-audio');

create policy "agenda_audio_auth_write" on storage.objects for all to authenticated
  using (bucket_id = 'agenda-audio')
  with check (bucket_id = 'agenda-audio');
