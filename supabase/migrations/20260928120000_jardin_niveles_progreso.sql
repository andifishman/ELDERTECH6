-- Progreso de niveles del modo "camino" de Jardín ElderTech (estilo candy
-- crush: 30 niveles con objetivo de puntos y presupuesto de movimientos,
-- desbloqueo secuencial, 1 a 3 estrellas según la eficiencia). El detalle de
-- cada nivel (objetivo, movimientos) vive hardcodeado en la app y el backend
-- (mismo criterio que el resto del contenido estático, como los tutoriales
-- de "Cómo usar") — esta tabla solo guarda el AVANCE de cada residente.
create table public.jardin_niveles_progreso (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  residente_id uuid not null references public.residentes(id) on delete cascade,
  nivel integer not null check (nivel between 1 and 30),
  estrellas integer not null check (estrellas between 1 and 3),
  movimientos_usados integer not null check (movimientos_usados >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residente_id, nivel)
);

create index idx_jardin_niveles_residente on public.jardin_niveles_progreso (residente_id);

alter table public.jardin_niveles_progreso enable row level security;

-- Residente: lee y guarda su propio progreso (el backend igual valida
-- desbloqueo y "quedate con el mejor intento" antes de escribir).
create policy "jardin_niveles_select_own" on public.jardin_niveles_progreso for select
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

create policy "jardin_niveles_insert_own" on public.jardin_niveles_progreso for insert
  with check (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

create policy "jardin_niveles_update_own" on public.jardin_niveles_progreso for update
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()))
  with check (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

-- Admin/staff: gestión completa (mismo criterio que partidas_juegos).
create policy "jardin_niveles_admin_all" on public.jardin_niveles_progreso for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());
