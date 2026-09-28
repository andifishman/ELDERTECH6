-- Dispositivo al que aplica un tutorial (Android / iPhone / Ambos). Se usa
-- para decidir qué tutoriales ve cada residente según residentes.tipo_celular
-- (migración 20260915120000):
--   - Usuario Android      -> ve tutoriales 'android' + 'ambos'
--   - Usuario iPhone       -> ve tutoriales 'iphone' + 'ambos'
--   - Usuario no_especificado -> ve todo (nunca se oculta contenido por falta
--     de información sobre el dispositivo del residente)
-- Default 'ambos': los tutoriales existentes (todos genéricos hasta ahora)
-- siguen viéndose por todo el mundo sin cambios.
alter table public.tutoriales
  add column if not exists dispositivo text not null default 'ambos'
  check (dispositivo in ('android', 'iphone', 'ambos'));
