-- Agrega el nuevo juego "puntos" (Une los Puntos) a la lista de juegos válidos.
-- Busca el constraint por su definición (no por nombre) para no depender del
-- nombre autogenerado que Postgres le puso en la migración original.
do $$
declare
  nombre_constraint text;
begin
  select conname into nombre_constraint
  from pg_constraint
  where conrelid = 'public.partidas_juegos'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%juego%';

  if nombre_constraint is not null then
    execute format('alter table public.partidas_juegos drop constraint %I', nombre_constraint);
  end if;
end $$;

alter table public.partidas_juegos
  add constraint partidas_juegos_juego_check
  check (juego in ('ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa', 'puntos'));
