-- El camino de niveles de Jardín ElderTech pasa de 30 a 60 niveles
-- (ver src/constants/nivelesJardin.ts). La restricción original solo
-- permitía niveles del 1 al 30, así que guardar el progreso de un nivel
-- mayor a 30 fallaría.
alter table public.jardin_niveles_progreso drop constraint if exists jardin_niveles_progreso_nivel_check;
alter table public.jardin_niveles_progreso add constraint jardin_niveles_progreso_nivel_check check (nivel between 1 and 60);
