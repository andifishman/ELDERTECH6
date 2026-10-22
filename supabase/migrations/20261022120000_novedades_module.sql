-- ============================================================
-- ElderTech — Novedades
--
-- Noticias de la residencia que el personal publica desde el
-- backoffice y los residentes leen desde el botón "Novedades" de la
-- Home. Cada novedad tiene título, texto y una foto opcional, va a
-- todos los residentes o solo a algunos grupos, y se deja de mostrar
-- sola un mes después de publicada (`visible_hasta`).
--
--   novedades          → la noticia en sí
--   novedad_lecturas   → qué residente ya la abrió (para el cartel "Nueva")
--
-- El aviso al celular reutiliza el módulo de notificaciones: al
-- publicar, el backend crea una notificación con pantalla_destino
-- 'novedades' y guarda su id en `notificacion_id`.
-- ============================================================

create table if not exists public.novedades (
  id               uuid primary key default gen_random_uuid(),
  organizacion_id  uuid not null references public.organizaciones(id) on delete cascade,
  titulo           text not null check (char_length(titulo) between 1 and 120),
  texto            text not null check (char_length(texto) between 1 and 4000),
  imagen_url       text,
  -- null = para todos los residentes; si no, solo para los integrantes de estos grupos.
  grupo_ids        uuid[],
  visible_hasta    timestamptz not null default (now() + interval '1 month'),
  notificacion_id  uuid references public.notifications(id) on delete set null,
  creado_por       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_novedades_org_visible on public.novedades (organizacion_id, visible_hasta desc);
create index if not exists idx_novedades_grupos on public.novedades using gin (grupo_ids);

create trigger trg_novedades_updated_at before update on public.novedades
for each row execute function public.set_updated_at();

create table if not exists public.novedad_lecturas (
  novedad_id    uuid not null references public.novedades(id) on delete cascade,
  residente_id  uuid not null references public.residentes(id) on delete cascade,
  leida_en      timestamptz not null default now(),
  primary key (novedad_id, residente_id)
);

create index if not exists idx_novedad_lecturas_residente on public.novedad_lecturas (residente_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Todo pasa por el backend con service_role; estas políticas son la red de
-- seguridad por si algo usa la anon key directo.
alter table public.novedades enable row level security;
alter table public.novedad_lecturas enable row level security;

drop policy if exists "novedades_admin_all" on public.novedades;
create policy "novedades_admin_all" on public.novedades for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());

drop policy if exists "novedad_lecturas_admin_read" on public.novedad_lecturas;
create policy "novedad_lecturas_admin_read" on public.novedad_lecturas for select
  using (public.auth_es_admin_o_staff());

drop policy if exists "novedad_lecturas_own" on public.novedad_lecturas;
create policy "novedad_lecturas_own" on public.novedad_lecturas for all
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()))
  with check (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

-- ─── Módulo "Novedades" en el sistema de permisos ───────────────────────────
insert into public.modulos (id, nombre, descripcion, orden, asignable) values
  ('novedades', 'Novedades', 'Noticias de la residencia para los residentes', 13, true)
on conflict (id) do nothing;

-- Mismo criterio que Grupos: es un módulo nuevo, así que no se le da acceso
-- automático a nadie — el Super Admin lo asigna desde Accesos.

notify pgrst, 'reload schema';
