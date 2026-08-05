-- Módulo "Hablemos" — mensajería 1:1 entre residentes de la misma organización.
-- Ver contexto de diseño (por qué no hay message_attachments/message_reads separadas,
-- por qué los campos "ultimo_mensaje_*" y "no_leidos_count" están desnormalizados)
-- en el plan de implementación del módulo.

create table public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  creado_por uuid not null references public.residentes(id) on delete cascade,
  ultimo_mensaje_preview text,
  ultimo_mensaje_tipo text check (ultimo_mensaje_tipo in ('texto', 'audio')),
  ultimo_mensaje_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversaciones_organizacion on public.conversaciones (organizacion_id);
create index idx_conversaciones_ultimo_mensaje_at on public.conversaciones (ultimo_mensaje_at desc);

create trigger trg_conversaciones_updated_at
before update on public.conversaciones
for each row execute function public.set_updated_at();

create table public.conversacion_participantes (
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  residente_id uuid not null references public.residentes(id) on delete cascade,
  no_leidos_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (conversacion_id, residente_id)
);

create index idx_conversacion_participantes_residente on public.conversacion_participantes (residente_id);

create table public.mensajes_hablemos (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  remitente_id uuid not null references public.residentes(id) on delete cascade,
  tipo text not null check (tipo in ('texto', 'audio')),
  contenido text,
  audio_url text,
  audio_duracion_segundos integer,
  estado text not null default 'enviado' check (estado in ('enviado', 'recibido', 'leido')),
  recibido_en timestamptz,
  leido_en timestamptz,
  created_at timestamptz not null default now(),
  constraint mensajes_hablemos_contenido_check check (
    (tipo = 'texto' and contenido is not null and audio_url is null)
    or (tipo = 'audio' and audio_url is not null and contenido is null)
  )
);

create index idx_mensajes_hablemos_conversacion on public.mensajes_hablemos (conversacion_id, created_at desc);
create index idx_mensajes_hablemos_remitente on public.mensajes_hablemos (remitente_id);

-- ─── Triggers de desnormalización ──────────────────────────────────────────────
-- Mantienen "último mensaje" en conversaciones y el contador de no-leídos en
-- conversacion_participantes sin que el backend tenga que hacerlo en dos escrituras
-- separadas (y sin riesgo de que queden desincronizados entre sí).

create or replace function public.hablemos_actualizar_ultimo_mensaje()
returns trigger language plpgsql as $$
begin
  update public.conversaciones
  set
    ultimo_mensaje_preview = case when new.tipo = 'audio' then '🎤 Nota de voz' else new.contenido end,
    ultimo_mensaje_tipo = new.tipo,
    ultimo_mensaje_at = new.created_at,
    updated_at = now()
  where id = new.conversacion_id;

  update public.conversacion_participantes
  set no_leidos_count = no_leidos_count + 1
  where conversacion_id = new.conversacion_id
    and residente_id <> new.remitente_id;

  return new;
end;
$$;

create trigger trg_mensajes_hablemos_actualizar_conversacion
after insert on public.mensajes_hablemos
for each row execute function public.hablemos_actualizar_ultimo_mensaje();

-- ─── RLS ────────────────────────────────────────────────────────────────────────
-- Solo políticas de SELECT: todo write pasa por el backend con la service-role key
-- (bypassa RLS). Estas políticas existen para autorizar la suscripción de Supabase
-- Realtime del cliente — ver el plan de implementación para el detalle de por qué.

alter table public.conversaciones enable row level security;
alter table public.conversacion_participantes enable row level security;
alter table public.mensajes_hablemos enable row level security;

create policy "conversaciones_select_participante" on public.conversaciones for select
  using (
    id in (
      select conversacion_id from public.conversacion_participantes
      where residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid())
    )
  );

create policy "conversacion_participantes_select_own" on public.conversacion_participantes for select
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

create policy "mensajes_hablemos_select_participante" on public.mensajes_hablemos for select
  using (
    conversacion_id in (
      select conversacion_id from public.conversacion_participantes
      where residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid())
    )
  );

-- ─── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.conversaciones;
alter publication supabase_realtime add table public.mensajes_hablemos;

-- ─── Storage: notas de voz ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hablemos-audio', 'hablemos-audio', true, 10485760, array['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a', 'audio/wav', 'audio/webm'])
on conflict (id) do nothing;

create policy "hablemos_audio_public_read" on storage.objects for select
  using (bucket_id = 'hablemos-audio');

create policy "hablemos_audio_auth_write" on storage.objects for all to authenticated
  using (bucket_id = 'hablemos-audio')
  with check (bucket_id = 'hablemos-audio');
