-- Juego "Palabras" (rueda de letras, 150 niveles) + sección "Juegos" del backoffice.
--
-- 1. 'palabras' como juego válido en partidas_juegos.
-- 2. Progreso de niveles y pistas del residente. El contenido de cada nivel vive en
--    la app (src/constants/nivelesPalabras.ts) — acá solo el AVANCE, igual que Jardín.
-- 3. Módulo "juegos" del backoffice (permisos por módulo).
-- 4. Funciones de ranking: el backoffice NO baja todas las partidas para sumar en el
--    cliente; la base agrega y el backend cachea el resultado (ver GamesRankingService).

-- ─── 1. Nuevo juego en partidas_juegos ───────────────────────────────────────
alter table public.partidas_juegos drop constraint if exists partidas_juegos_juego_check;
alter table public.partidas_juegos
  add constraint partidas_juegos_juego_check
  check (juego in ('ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa', 'puntos', 'jardin', 'bloques', 'palabras'));

-- ─── 2. Progreso del juego Palabras ──────────────────────────────────────────
create table if not exists public.palabras_niveles_progreso (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  residente_id uuid not null references public.residentes(id) on delete cascade,
  nivel integer not null check (nivel between 1 and 150),
  pistas_usadas integer not null default 0 check (pistas_usadas >= 0),
  created_at timestamptz not null default now(),
  unique (residente_id, nivel)
);

create index if not exists idx_palabras_niveles_residente on public.palabras_niveles_progreso (residente_id);

-- Saldo de pistas: se empieza con 3 y cada nivel completado por primera vez suma 3.
create table if not exists public.palabras_pistas (
  residente_id uuid primary key references public.residentes(id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  pistas integer not null default 3 check (pistas >= 0),
  updated_at timestamptz not null default now()
);

alter table public.palabras_niveles_progreso enable row level security;
alter table public.palabras_pistas enable row level security;

-- Residente: solo lectura de lo suyo (todo write pasa por el backend con la service-role key).
create policy "palabras_niveles_select_own" on public.palabras_niveles_progreso for select
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));
create policy "palabras_niveles_admin_all" on public.palabras_niveles_progreso for all
  using (public.auth_es_admin_o_staff()) with check (public.auth_es_admin_o_staff());

create policy "palabras_pistas_select_own" on public.palabras_pistas for select
  using (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));
create policy "palabras_pistas_admin_all" on public.palabras_pistas for all
  using (public.auth_es_admin_o_staff()) with check (public.auth_es_admin_o_staff());

-- ─── 3. Módulo "Juegos" del backoffice ───────────────────────────────────────
insert into public.modulos (id, nombre, descripcion, orden, asignable) values
  ('juegos', 'Juegos', 'Ranking y estadísticas de los juegos de los residentes', 5, true)
on conflict (id) do nothing;

-- ─── 4. Funciones de ranking (solo las llama el backend con la service-role key) ─
create or replace function public.ranking_juego(
  p_org uuid,
  p_juego text,
  p_desde timestamptz default null,
  p_limite integer default 50
)
returns table (
  residente_id uuid,
  nombre text,
  partidas bigint,
  ganadas bigint,
  perdidas bigint,
  mejor_puntaje integer,
  puntos_total bigint,
  ultima_partida timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    p.residente_id,
    coalesce(nullif(r.nombre_completo, ''), trim(coalesce(r.nombre, '') || ' ' || coalesce(r.apellido, '')), 'Residente') as nombre,
    count(*) as partidas,
    count(*) filter (where p.resultado = 'ganado') as ganadas,
    count(*) filter (where p.resultado = 'perdido') as perdidas,
    max(p.puntos) as mejor_puntaje,
    coalesce(sum(p.puntos), 0)::bigint as puntos_total,
    max(p.created_at) as ultima_partida
  from public.partidas_juegos p
  join public.residentes r on r.id = p.residente_id
  where p.organizacion_id = p_org
    and p.juego = p_juego
    and (p_desde is null or p.created_at >= p_desde)
  group by p.residente_id, r.nombre_completo, r.nombre, r.apellido
  order by max(p.puntos) desc nulls last,
           count(*) filter (where p.resultado = 'ganado') desc,
           count(*) desc
  limit greatest(p_limite, 1)
$$;

create or replace function public.resumen_juegos(p_org uuid, p_desde timestamptz default null)
returns table (
  juego text,
  partidas bigint,
  jugadores bigint,
  ganadas bigint,
  mejor_puntaje integer,
  ultima_partida timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    p.juego,
    count(*) as partidas,
    count(distinct p.residente_id) as jugadores,
    count(*) filter (where p.resultado = 'ganado') as ganadas,
    max(p.puntos) as mejor_puntaje,
    max(p.created_at) as ultima_partida
  from public.partidas_juegos p
  where p.organizacion_id = p_org
    and (p_desde is null or p.created_at >= p_desde)
  group by p.juego
$$;

revoke all on function public.ranking_juego(uuid, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.resumen_juegos(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.ranking_juego(uuid, text, timestamptz, integer) to service_role;
grant execute on function public.resumen_juegos(uuid, timestamptz) to service_role;
