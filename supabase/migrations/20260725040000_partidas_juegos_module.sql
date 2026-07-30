create table public.partidas_juegos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  residente_id uuid not null references public.residentes(id) on delete cascade,
  juego text not null check (juego in ('ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa')),
  resultado text check (resultado in ('ganado', 'perdido')),
  created_at timestamptz not null default now()
);

create index idx_partidas_juegos_residente on public.partidas_juegos (residente_id);
create index idx_partidas_juegos_residente_juego on public.partidas_juegos (residente_id, juego);

alter table public.partidas_juegos enable row level security;

-- Residente: registra sus propias partidas (no necesita leerlas de vuelta — las ve el backoffice)
create policy "partidas_juegos_insert_own" on public.partidas_juegos for insert
  with check (residente_id in (select residente_id from public.perfiles_usuario where id = auth.uid()));

-- Admin/staff: gestión completa (mismo criterio que el resto del backoffice)
create policy "partidas_juegos_admin_all" on public.partidas_juegos for all
  using (public.auth_es_admin_o_staff())
  with check (public.auth_es_admin_o_staff());
