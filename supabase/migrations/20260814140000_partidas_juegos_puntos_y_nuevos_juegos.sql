-- Agrega los juegos "jardin" (match-3) y "bloques" (block-puzzle) y una
-- columna de puntaje numérico — los 7 juegos existentes son de
-- ganado/perdido y no la necesitan (queda null para ellos), pero estos dos
-- son de puntaje y no tienen un estado de "ganar/perder" real.
alter table public.partidas_juegos
  add column puntos integer check (puntos is null or puntos >= 0);

do $$
declare
  nombre_constraint text;
begin
  select conname into nombre_constraint
  from pg_constraint
  where conrelid = 'public.partidas_juegos'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%juego%'
    and pg_get_constraintdef(oid) not like '%puntos%';

  if nombre_constraint is not null then
    execute format('alter table public.partidas_juegos drop constraint %I', nombre_constraint);
  end if;
end $$;

alter table public.partidas_juegos
  add constraint partidas_juegos_juego_check
  check (juego in ('ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa', 'puntos', 'jardin', 'bloques'));

create index idx_partidas_juegos_residente_juego_puntos on public.partidas_juegos (residente_id, juego, puntos desc)
  where puntos is not null;
