-- Índice para el ranking "Top 3" por organización (GET /api/games/:juego/top)
-- — la consulta filtra por organizacion_id + juego y ordena por puntos desc,
-- algo que los índices existentes (por residente_id) no cubren bien.
create index if not exists idx_partidas_juegos_org_juego_puntos
  on public.partidas_juegos (organizacion_id, juego, puntos desc)
  where puntos is not null;
