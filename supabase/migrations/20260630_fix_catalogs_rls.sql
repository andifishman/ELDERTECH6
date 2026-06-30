-- ============================================================
-- ElderTech — Fix RLS catálogos + schema fixes
-- Fecha: 2026-06-30
-- YA APLICADO EN PRODUCCIÓN VÍA MCP
-- ============================================================

-- ─── 1. faq_asistente: permitir NULL en campos opcionales ────────────────────
-- categoria y emoji eran NOT NULL pero el form los pasa null cuando están vacíos
ALTER TABLE faq_asistente
  ALTER COLUMN categoria DROP NOT NULL,
  ALTER COLUMN emoji     DROP NOT NULL;

-- ─── 2. tipos_actividad: columnas de defaults para pre-fill del form ─────────
ALTER TABLE tipos_actividad
  ADD COLUMN IF NOT EXISTS hora_inicio_default text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hora_fin_default     text DEFAULT NULL;

-- ─── 3. actividades: tipo_actividad_id nullable (categoría opcional) ─────────
ALTER TABLE actividades
  ALTER COLUMN tipo_actividad_id DROP NOT NULL;

-- ─── 4. RLS: tipos_actividad — INSERT/UPDATE/DELETE para admins/staff ─────────
DROP POLICY IF EXISTS "tipos_actividad_insert" ON tipos_actividad;
CREATE POLICY "tipos_actividad_insert" ON tipos_actividad
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "tipos_actividad_update" ON tipos_actividad;
CREATE POLICY "tipos_actividad_update" ON tipos_actividad
  FOR UPDATE TO authenticated
  USING (
    organizacion_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "tipos_actividad_delete" ON tipos_actividad;
CREATE POLICY "tipos_actividad_delete" ON tipos_actividad
  FOR DELETE TO authenticated
  USING (
    organizacion_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

-- ─── 5. RLS: ubicaciones ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ubicaciones_select" ON ubicaciones;
CREATE POLICY "ubicaciones_select" ON ubicaciones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ubicaciones_insert" ON ubicaciones;
CREATE POLICY "ubicaciones_insert" ON ubicaciones
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')));

DROP POLICY IF EXISTS "ubicaciones_update" ON ubicaciones;
CREATE POLICY "ubicaciones_update" ON ubicaciones
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')));

DROP POLICY IF EXISTS "ubicaciones_delete" ON ubicaciones;
CREATE POLICY "ubicaciones_delete" ON ubicaciones
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')));

-- ─── 6. RLS: responsables ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "responsables_select" ON responsables;
CREATE POLICY "responsables_select" ON responsables FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "responsables_insert" ON responsables;
CREATE POLICY "responsables_insert" ON responsables
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')));

DROP POLICY IF EXISTS "responsables_update" ON responsables;
CREATE POLICY "responsables_update" ON responsables
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')));

DROP POLICY IF EXISTS "responsables_delete" ON responsables;
CREATE POLICY "responsables_delete" ON responsables
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')));

-- ─── 7. RLS: faq_asistente ───────────────────────────────────────────────────
-- ya existía faq_authenticated_all (ALL para authenticated) — no se toca
