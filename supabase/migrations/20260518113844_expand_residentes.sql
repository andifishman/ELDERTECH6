-- Quitar columnas FK que apuntan a tablas eliminadas
ALTER TABLE residentes
    DROP COLUMN IF EXISTS sector_id,
    DROP COLUMN IF EXISTS habitacion_id;

-- Agregar nuevos campos del formulario de registro
ALTER TABLE residentes
    ADD COLUMN IF NOT EXISTS piso      TEXT,
    ADD COLUMN IF NOT EXISTS habitacion TEXT,
    ADD COLUMN IF NOT EXISTS notas     TEXT,
    ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
