-- ─── Tipos ────────────────────────────────────────────────────────────────────
create type public.tipo_notificacion_enum as enum (
  'informacion','importante','recordatorio','urgente','actividad','tutorial','general'
);

create type public.destino_tipo_enum as enum (
  'todos','residentes','especificos','seccion','habitacion','intereses','nivel_dificultad'
);

create type public.programacion_tipo_enum as enum ('instantanea','programada');

create type public.recurrencia_enum as enum ('ninguna','diaria','semanal','mensual');

create type public.estado_notificacion_enum as enum (
  'borrador','programada','enviando','enviada','fallida','cancelada'
);

create type public.prioridad_notificacion_enum as enum ('alta','normal','baja');

create type public.estado_destinatario_enum as enum (
  'pendiente','enviado','entregado','fallido','abierto'
);

-- ─── device_tokens ──────────────────────────────────────────────────────────────
create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  perfil_usuario_id uuid not null references auth.users(id) on delete cascade,
  residente_id uuid references public.residentes(id) on delete cascade,
  organizacion_id uuid references public.organizaciones(id) on delete cascade,
  expo_push_token text not null unique,
  plataforma text not null check (plataforma in ('ios','android','web')),
  dispositivo text,
  activo boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_device_tokens_perfil on public.device_tokens(perfil_usuario_id);
create index idx_device_tokens_residente on public.device_tokens(residente_id);
create index idx_device_tokens_activo on public.device_tokens(activo) where activo = true;

create trigger trg_device_tokens_updated_at before update on public.device_tokens
for each row execute function public.set_updated_at();

alter table public.device_tokens enable row level security;
create policy "device_tokens_own" on public.device_tokens for all
  using (perfil_usuario_id = auth.uid())
  with check (perfil_usuario_id = auth.uid());
create policy "device_tokens_admin_read" on public.device_tokens for select
  using (public.auth_es_admin_o_staff());

-- ─── notifications ──────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  imagen_url text,
  icono text,
  tipo public.tipo_notificacion_enum not null default 'general',
  destino_tipo public.destino_tipo_enum not null default 'todos',
  destino_filtro jsonb,
  excluir_residente_ids uuid[],
  programacion_tipo public.programacion_tipo_enum not null default 'instantanea',
  programada_para timestamptz,
  recurrencia public.recurrencia_enum not null default 'ninguna',
  estado public.estado_notificacion_enum not null default 'borrador',
  silenciosa boolean not null default false,
  sonido boolean not null default true,
  vibracion boolean not null default true,
  prioridad public.prioridad_notificacion_enum not null default 'normal',
  pantalla_destino text,
  actividad_id uuid references public.actividades(id) on delete set null,
  creado_por uuid references auth.users(id) on delete set null,
  enviado_por uuid references auth.users(id) on delete set null,
  enviada_en timestamptz,
  cancelada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notifications_org on public.notifications(organizacion_id);
create index idx_notifications_estado on public.notifications(estado);
create index idx_notifications_programada on public.notifications(programada_para) where estado = 'programada';
create index idx_notifications_created on public.notifications(created_at desc);

create trigger trg_notifications_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
create policy "notifications_admin_all" on public.notifications for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());

-- ─── notification_recipients ────────────────────────────────────────────────────
create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  residente_id uuid not null references public.residentes(id) on delete cascade,
  device_token_id uuid references public.device_tokens(id) on delete set null,
  estado public.estado_destinatario_enum not null default 'pendiente',
  expo_ticket_id text,
  error_mensaje text,
  enviado_en timestamptz,
  entregado_en timestamptz,
  abierto_en timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notif_recipients_notification on public.notification_recipients(notification_id);
create index idx_notif_recipients_residente on public.notification_recipients(residente_id);
create index idx_notif_recipients_estado on public.notification_recipients(estado);

alter table public.notification_recipients enable row level security;
create policy "notification_recipients_admin_all" on public.notification_recipients for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());
create policy "notification_recipients_own_select" on public.notification_recipients for select
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));
create policy "notification_recipients_own_update" on public.notification_recipients for update
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()))
  with check (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

-- ─── notification_logs ──────────────────────────────────────────────────────────
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete set null,
  accion text not null check (accion in ('crear','editar','eliminar','programar','cancelar','enviar','reenviar','duplicar','error')),
  usuario_id uuid references auth.users(id) on delete set null,
  descripcion text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_notification_logs_notification on public.notification_logs(notification_id);
create index idx_notification_logs_created on public.notification_logs(created_at desc);

alter table public.notification_logs enable row level security;
create policy "notification_logs_admin_all" on public.notification_logs for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());

-- ─── Integración con Actividades ────────────────────────────────────────────────
alter table public.actividades
  add column if not exists notificar_al_crear boolean not null default false,
  add column if not exists recordatorio_minutos_antes integer,
  add column if not exists recordatorio_enviado boolean not null default false,
  add column if not exists notificacion_id uuid references public.notifications(id) on delete set null;
