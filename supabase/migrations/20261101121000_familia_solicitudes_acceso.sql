-- ============================================================
-- ElderTech — Solicitudes de acceso a la app de familiares
--
-- Cuando alguien intenta entrar con un email que NO está dado de alta, la app le dice que no
-- está dado de alta y deja una solicitud para que el personal la apruebe (o la rechace) desde
-- el backoffice. Aprobarla = dar de alta al familiar (queda en `familiares`).
--
-- Es un endpoint público (sin sesión): por eso un solo pedido pendiente por email e institución
-- (los reintentos solo suman `intentos`), y el backend limita cuántos se aceptan.
-- RLS: solo admin/staff, igual que el resto de las tablas de familias.
-- ============================================================

create table if not exists public.familia_solicitudes_acceso (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  email           text not null check (char_length(email) between 3 and 160),
  nombre          text check (nombre is null or char_length(nombre) <= 80),
  apellido        text check (apellido is null or char_length(apellido) <= 80),
  telefono        text check (telefono is null or char_length(telefono) <= 40),
  -- A quién dice ser familiar: texto libre, lo lee el personal para elegir el residente correcto.
  residente_texto text check (residente_texto is null or char_length(residente_texto) <= 160),
  parentesco      text check (parentesco is null or char_length(parentesco) <= 60),
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  intentos        integer not null default 1,
  familiar_id     uuid references public.familiares(id) on delete set null,
  resuelto_por    uuid references auth.users(id) on delete set null,
  resuelto_en     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Un solo pedido pendiente por email e institución.
create unique index if not exists idx_familia_solicitudes_pendiente_unica
  on public.familia_solicitudes_acceso (organizacion_id, lower(email)) where estado = 'pendiente';

create index if not exists idx_familia_solicitudes_org
  on public.familia_solicitudes_acceso (organizacion_id, estado, created_at desc);

create trigger trg_familia_solicitudes_updated_at before update on public.familia_solicitudes_acceso
for each row execute function public.set_updated_at();

alter table public.familia_solicitudes_acceso enable row level security;

drop policy if exists "familia_solicitudes_acceso_admin_all" on public.familia_solicitudes_acceso;
create policy "familia_solicitudes_acceso_admin_all" on public.familia_solicitudes_acceso
  for all using (public.auth_es_admin_o_staff()) with check (public.auth_es_admin_o_staff());

-- Registra (o refresca) un pedido pendiente. Atómico: dos intentos simultáneos con el mismo email no
-- chocan contra el índice único. Devuelve el id y si es un pedido nuevo.
create or replace function public.familia_registrar_solicitud(
  p_organizacion uuid, p_email text, p_nombre text, p_apellido text, p_telefono text, p_residente_texto text, p_parentesco text
) returns table (id uuid, nueva boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_insertada boolean;
begin
  insert into public.familia_solicitudes_acceso (organizacion_id, email, nombre, apellido, telefono, residente_texto, parentesco)
  values (p_organizacion, lower(trim(p_email)), p_nombre, p_apellido, p_telefono, p_residente_texto, p_parentesco)
  on conflict (organizacion_id, lower(email)) where estado = 'pendiente'
  do update set
    intentos = public.familia_solicitudes_acceso.intentos + 1,
    nombre = coalesce(excluded.nombre, public.familia_solicitudes_acceso.nombre),
    apellido = coalesce(excluded.apellido, public.familia_solicitudes_acceso.apellido),
    telefono = coalesce(excluded.telefono, public.familia_solicitudes_acceso.telefono),
    residente_texto = coalesce(excluded.residente_texto, public.familia_solicitudes_acceso.residente_texto),
    parentesco = coalesce(excluded.parentesco, public.familia_solicitudes_acceso.parentesco)
  returning public.familia_solicitudes_acceso.id, (xmax = 0) into v_id, v_insertada;
  return query select v_id, v_insertada;
end;
$$;

-- Solo el backend (service_role) la llama.
revoke execute on function public.familia_registrar_solicitud(uuid, text, text, text, text, text, text) from public, anon, authenticated;
