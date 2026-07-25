-- Columnas de defaults en tipos_actividad para pre-completar el formulario
ALTER TABLE tipos_actividad
  ADD COLUMN IF NOT EXISTS hora_inicio_default text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hora_fin_default     text DEFAULT NULL;

-- Actividades: tipo_actividad_id puede ser nulo (categoría opcional)
ALTER TABLE actividades
  ALTER COLUMN tipo_actividad_id DROP NOT NULL;
