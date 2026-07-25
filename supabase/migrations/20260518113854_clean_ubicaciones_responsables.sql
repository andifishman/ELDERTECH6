-- ubicaciones: quitar piso_id (pisos se va a eliminar)
ALTER TABLE ubicaciones
    DROP COLUMN IF EXISTS piso_id;

-- responsables: quitar tipo_responsable_id (tipos_responsable se va a eliminar)
ALTER TABLE responsables
    DROP COLUMN IF EXISTS tipo_responsable_id;
