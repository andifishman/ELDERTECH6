-- ============================================================
-- ElderTech — Permisos granulares por usuario y módulo (backoffice)
--
-- Antes: cualquier usuario con rol admin/staff podía hacer TODO en el
-- backoffice (los permisos eran solo visuales). Ahora:
--   modulos        → cada sección protegible del backoffice
--   modulo_usuario → qué puede hacer cada usuario dentro de cada módulo
--                    (ver / crear / editar / eliminar)
-- "Super Super Admin" sigue siendo la allowlist de emails de
-- backend/src/config/superAdmins.ts: tiene todo y no depende de estas tablas.
-- ============================================================

create table if not exists public.modulos (
  id          text primary key,
  nombre      text not null,
  descripcion text,
  orden       smallint not null default 0,
  -- false = solo el Super Super Admin puede usarlo; nunca se asigna a nadie más
  asignable   boolean not null default true,
  activo      boolean not null default true
);

insert into public.modulos (id, nombre, descripcion, orden, asignable) values
  ('dashboard',      'Dashboard',              'Resumen general y métricas',                      1, true),
  ('horarios',       'Horarios',               'Actividades de la residencia',                    2, true),
  ('tutoriales',     'Tutoriales',             'Videos y guías para los residentes',              3, true),
  ('usuarios',       'Usuarios (residentes)',  'Alta y ficha de los residentes',                  4, true),
  ('pedidos',        'Pedidos y Sugerencias',  'Solicitudes que envían los residentes',           5, true),
  ('notificaciones', 'Notificaciones',         'Notificaciones push a los residentes',            6, true),
  ('asistente',      'Asistente / FAQ',        'Preguntas frecuentes e historial del asistente',  7, true),
  ('auditoria',      'Auditoría',              'Registro de acciones del backoffice',             8, true),
  ('configuracion',  'Configuración',          'Configuración general de la residencia',          9, true),
  ('administradores','Administradores',        'Quién puede entrar al backoffice',               10, false),
  ('accesos',        'Accesos',                'Permisos de cada usuario por módulo',            11, false)
on conflict (id) do nothing;

create table if not exists public.modulo_usuario (
  usuario_id    uuid not null references public.perfiles_usuario(id) on delete cascade,
  modulo_id     text not null references public.modulos(id) on delete cascade,
  puede_ver     boolean not null default false,
  puede_crear   boolean not null default false,
  puede_editar  boolean not null default false,
  puede_eliminar boolean not null default false,
  updated_by    uuid,
  updated_at    timestamptz not null default now(),
  primary key (usuario_id, modulo_id),
  -- crear/editar/eliminar sin poder ver el módulo no tiene sentido
  constraint modulo_usuario_ver_requerido check (puede_ver or not (puede_crear or puede_editar or puede_eliminar))
);

create index if not exists idx_modulo_usuario_usuario on public.modulo_usuario (usuario_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- A propósito NO hay políticas de escritura (ni siquiera para admin/staff): si
-- las hubiera, cualquier admin podría darse permisos a sí mismo desde el
-- navegador con la anon key. Solo el backend (service role, que saltea RLS)
-- escribe acá, y solo después de verificar que quien llama es Super Admin.
alter table public.modulos enable row level security;
alter table public.modulo_usuario enable row level security;

drop policy if exists "modulos_select" on public.modulos;
create policy "modulos_select" on public.modulos for select to authenticated using (true);

drop policy if exists "modulo_usuario_select_own" on public.modulo_usuario;
create policy "modulo_usuario_select_own" on public.modulo_usuario for select to authenticated
  using (usuario_id = auth.uid());

-- ─── Permisos iniciales: mismo comportamiento que había hasta ahora ──────────
-- Los admin/staff que ya existen conservan lo que podían hacer (todo el
-- contenido). Configuración, Administradores y Accesos quedan solo para el
-- Super Super Admin. El staff (rol "editor") no veía Auditoría.
insert into public.modulo_usuario (usuario_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
select p.id, m.id, true, true, true, true
from public.perfiles_usuario p
cross join public.modulos m
where p.rol in ('admin', 'staff')
  and m.asignable
  and m.id <> 'configuracion'
  and not (p.rol = 'staff' and m.id = 'auditoria')
on conflict (usuario_id, modulo_id) do nothing;
