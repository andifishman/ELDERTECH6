-- Tipos de solicitud que puede enviar un residente y su estado de gestión
create type public.tipo_pedido_enum as enum (
  'pedido', 'comentario', 'sugerencia', 'actividad_propuesta', 'recomendacion_pelicula'
);

create type public.estado_pedido_enum as enum ('pendiente', 'en_proceso', 'resuelta');

create table public.pedidos_sugerencias (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  residente_id uuid not null references public.residentes(id) on delete cascade,
  tipo public.tipo_pedido_enum not null,
  titulo text not null,
  descripcion text,
  audio_url text,
  audio_duracion_segundos integer,
  transcripcion text,
  transcripcion_estado text check (transcripcion_estado in ('pendiente', 'completada', 'fallida')),
  estado public.estado_pedido_enum not null default 'pendiente',
  resuelto_por uuid references auth.users(id) on delete set null,
  resuelto_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pedidos_residente on public.pedidos_sugerencias (residente_id);
create index idx_pedidos_organizacion on public.pedidos_sugerencias (organizacion_id);
create index idx_pedidos_estado on public.pedidos_sugerencias (estado);
create index idx_pedidos_created_at on public.pedidos_sugerencias (created_at desc);

create trigger trg_pedidos_sugerencias_updated_at
before update on public.pedidos_sugerencias
for each row execute function public.set_updated_at();

alter table public.pedidos_sugerencias enable row level security;

-- Residente: ve y crea únicamente sus propias solicitudes
create policy "pedidos_select_own" on public.pedidos_sugerencias for select
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

create policy "pedidos_insert_own" on public.pedidos_sugerencias for insert
  with check (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

-- Admin/staff: gestión completa (usa la misma función SECURITY DEFINER que catálogos)
create policy "pedidos_admin_all" on public.pedidos_sugerencias for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());

-- Bucket de audio para los mensajes de voz de las solicitudes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pedidos-audio', 'pedidos-audio', true, 10485760, array['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a', 'audio/wav', 'audio/webm'])
on conflict (id) do nothing;

create policy "pedidos_audio_public_read" on storage.objects for select
  using (bucket_id = 'pedidos-audio');

create policy "pedidos_audio_auth_write" on storage.objects for all to authenticated
  using (bucket_id = 'pedidos-audio')
  with check (bucket_id = 'pedidos-audio');
