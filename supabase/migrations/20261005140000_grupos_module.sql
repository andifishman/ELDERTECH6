-- ============================================================
-- ElderTech — Grupos
--
-- Agrupa residentes para poder usarlos como destinatarios en
-- notificaciones (y, a futuro, otras funcionalidades) sin tener que
-- reinventar un mecanismo de "a quién le llega esto" cada vez.
--
-- Dos tipos de grupo:
--   'seccion'       → uno por cada valor de seccion_enum, se mantiene
--                      sincronizado automáticamente (trigger) con
--                      residentes.seccion. No se puede borrar.
--   'personalizado' → los crea el staff a mano (ej. "Taller de música").
--
-- Un residente puede pertenecer a varios grupos a la vez.
-- ============================================================

create table if not exists public.grupos (
  id             uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  nombre         text not null,
  descripcion    text,
  tipo           text not null default 'personalizado' check (tipo in ('seccion', 'personalizado')),
  -- Solo seteado para tipo='seccion' — ancla del auto-sync con residentes.seccion.
  seccion        public.seccion_enum,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (organizacion_id, nombre)
);

-- Un solo grupo "seccion" por cada valor de seccion_enum y organización.
create unique index if not exists idx_grupos_seccion_unica
  on public.grupos (organizacion_id, seccion) where seccion is not null;

create index if not exists idx_grupos_organizacion on public.grupos (organizacion_id);

create trigger trg_grupos_updated_at before update on public.grupos
for each row execute function public.set_updated_at();

create table if not exists public.grupo_residentes (
  grupo_id     uuid not null references public.grupos(id) on delete cascade,
  residente_id uuid not null references public.residentes(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (grupo_id, residente_id)
);

create index if not exists idx_grupo_residentes_residente on public.grupo_residentes (residente_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Mismo patrón que tutoriales/faq_asistente/etc: solo admin/staff, siempre vía
-- backend con service_role (la autorización fina — quién puede crear/editar/
-- eliminar grupos — la verifica el backend contra modulo_usuario, no acá).
alter table public.grupos enable row level security;
alter table public.grupo_residentes enable row level security;

drop policy if exists "grupos_admin_all" on public.grupos;
create policy "grupos_admin_all" on public.grupos for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());

drop policy if exists "grupo_residentes_admin_all" on public.grupo_residentes;
create policy "grupo_residentes_admin_all" on public.grupo_residentes for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());

-- ─── Grupos base (uno por sección) ──────────────────────────────────────────
-- Mapeo confirmado 1:1 con los 10 valores de seccion_enum. Idempotente.
insert into public.grupos (organizacion_id, nombre, descripcion, tipo, seccion)
select o.id, v.nombre, v.descripcion, 'seccion', v.seccion::public.seccion_enum
from public.organizaciones o
cross join (values
  ('AC1',             'Residentes de la sección 1 AC',             '1 AC'),
  ('B1',              'Residentes de la sección 1 B',               '1 B'),
  ('FRAGA1',          'Residentes de la sección 1 FRAGA',           '1 FRAGA'),
  ('AC2',             'Residentes de la sección 2 AC',              '2 AC'),
  ('B2',              'Residentes de la sección 2 B',                '2 B'),
  ('MODERADO2',       'Residentes de la sección 2 MODERADO',        '2 MODERADO'),
  ('REHABILITACION2', 'Residentes de la sección 2 REHABILITACION',  '2 REHABILITACION'),
  ('AC3',             'Residentes de la sección 3 AC',              '3 AC'),
  ('B3',              'Residentes de la sección 3B',                '3B'),
  ('BAIT',            'Residentes de la sección BAIT',              'BAIT')
) as v(nombre, descripcion, seccion)
on conflict (organizacion_id, nombre) do nothing;

-- ─── Backfill: vincular residentes existentes a su grupo de sección ─────────
insert into public.grupo_residentes (grupo_id, residente_id)
select g.id, r.id
from public.residentes r
join public.grupos g
  on g.organizacion_id = r.organizacion_id
 and g.tipo = 'seccion'
 and g.seccion = r.seccion
where r.seccion is not null
on conflict (grupo_id, residente_id) do nothing;

-- ─── Auto-sync: mantener grupo_residentes al día cuando cambia la sección ───
-- Nivel DB (no solo en el backend) para que nunca quede desincronizado, ni
-- siquiera si algo escribe directo (ej. la Edge Function de alta de usuarios).
create or replace function public.sync_grupo_seccion_residente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and NEW.seccion is not distinct from OLD.seccion then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and OLD.seccion is not null then
    delete from public.grupo_residentes gr
    using public.grupos g
    where gr.grupo_id = g.id
      and g.tipo = 'seccion'
      and g.organizacion_id = OLD.organizacion_id
      and g.seccion = OLD.seccion
      and gr.residente_id = OLD.id;
  end if;

  if NEW.seccion is not null then
    insert into public.grupo_residentes (grupo_id, residente_id)
    select g.id, NEW.id
    from public.grupos g
    where g.tipo = 'seccion'
      and g.organizacion_id = NEW.organizacion_id
      and g.seccion = NEW.seccion
    on conflict (grupo_id, residente_id) do nothing;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_sync_grupo_seccion on public.residentes;
create trigger trg_sync_grupo_seccion
after insert or update of seccion on public.residentes
for each row execute function public.sync_grupo_seccion_residente();

-- ─── Módulo "Grupos" en el sistema de permisos ──────────────────────────────
insert into public.modulos (id, nombre, descripcion, orden, asignable) values
  ('grupos', 'Grupos', 'Agrupar residentes para notificaciones y otras funciones', 12, true)
on conflict (id) do nothing;

-- Nota: a propósito NO se le da acceso automático a los admin/staff
-- existentes (a diferencia del backfill original de permisos) — es un
-- módulo nuevo, el Super Admin lo asigna explícitamente desde Accesos.

-- ─── Notificaciones: nuevo destino_tipo "grupo" ─────────────────────────────
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción en la que
-- se inserta una fila con ese valor — al estar en su propia migración, no hay
-- problema (cada migración de Supabase corre en su propia transacción).
alter type public.destino_tipo_enum add value if not exists 'grupo';
