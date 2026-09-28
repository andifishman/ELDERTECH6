-- Tipo de celular del residente (Android / iPhone / No especificado).
-- Se carga al crear o editar un usuario desde el backoffice y se usa para
-- decidir qué tutoriales mostrar primero en la app (ver dispositivo en
-- tutoriales, migración 20260915120500). "no_especificado" es el default
-- explícito para usuarios existentes — no inventamos qué dispositivo usan.
--
-- TEXT + CHECK en vez de un enum nativo de Postgres (mismo patrón que
-- tutoriales.nivel): un enum nativo exige una migración aparte, no
-- transaccional, para agregar valores nuevos a futuro, y acá alcanza con un
-- CHECK constraint.
alter table public.residentes
  add column if not exists tipo_celular text not null default 'no_especificado'
  check (tipo_celular in ('android', 'iphone', 'no_especificado'));
