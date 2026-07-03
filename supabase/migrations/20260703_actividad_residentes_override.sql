-- ============================================================
-- ElderTech — Excepciones residente↔actividad + eliminar intereses
-- Fecha: 2026-07-03
-- IMPORTANTE: Correr en Supabase Dashboard → SQL Editor
-- ============================================================
--
-- Contexto: el targeting de actividades por "intereses" se elimina
-- por completo. Ahora el único filtro automático es el piso
-- (pisos_objetivo, ya existente). Se agrega una tabla de excepciones
-- para incluir o excluir residentes puntuales sin importar su piso.
-- ============================================================

-- PASO 1: Tabla de excepciones
CREATE TABLE IF NOT EXISTS actividad_residentes_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id uuid NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  residente_id uuid NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  incluido boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actividad_id, residente_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_override_actividad ON actividad_residentes_override(actividad_id);
CREATE INDEX IF NOT EXISTS idx_ar_override_residente ON actividad_residentes_override(residente_id);

ALTER TABLE actividad_residentes_override ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_override_select" ON actividad_residentes_override;
CREATE POLICY "ar_override_select" ON actividad_residentes_override
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ar_override_insert" ON actividad_residentes_override;
CREATE POLICY "ar_override_insert" ON actividad_residentes_override
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff'))
  );

DROP POLICY IF EXISTS "ar_override_delete" ON actividad_residentes_override;
CREATE POLICY "ar_override_delete" ON actividad_residentes_override
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff'))
  );

-- PASO 2: Eliminar el targeting por intereses (ya no se usa en ningún lado)
-- ⚠️ DESTRUCTIVO: borra la tabla y todos sus datos. Revisar antes de correr.
DROP TABLE IF EXISTS actividad_intereses;
