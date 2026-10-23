-- Juego "Palabras": de 150 a 300 niveles. Solo se amplía el tope del check del progreso.
alter table public.palabras_niveles_progreso drop constraint if exists palabras_niveles_progreso_nivel_check;
alter table public.palabras_niveles_progreso
  add constraint palabras_niveles_progreso_nivel_check check (nivel between 1 and 300);
