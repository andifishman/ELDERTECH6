-- ============================================================
-- ElderTech — Se elimina el juego "Sopa de Letras"
-- El juego se sacó de la app (pantalla, menú de Juegos, guía "¿Cómo usar?",
-- asistente, backoffice y app de familiares). Acá se borran sus partidas
-- guardadas y 'sopa' deja de ser un juego válido en partidas_juegos.
-- OJO: el DELETE no se puede deshacer (se pierde el historial de partidas
-- de Sopa de Letras de los residentes).
-- Fecha: 2026-11-27
-- ============================================================

delete from public.partidas_juegos where juego = 'sopa';

alter table public.partidas_juegos drop constraint if exists partidas_juegos_juego_check;
alter table public.partidas_juegos
  add constraint partidas_juegos_juego_check
  check (juego in ('ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'puntos', 'jardin', 'bloques', 'palabras'));
