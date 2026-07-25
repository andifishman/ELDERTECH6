-- ─── audit_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid REFERENCES organizaciones(id) ON DELETE SET NULL,
  usuario_id    uuid,
  usuario_nombre text,
  accion        text NOT NULL,
  tabla_afectada text NOT NULL,
  registro_id   text,
  descripcion   text,
  datos_nuevos  jsonb,
  datos_previos jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_authenticated" ON audit_logs;
CREATE POLICY "audit_logs_authenticated" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── actividades ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "actividades_authenticated_write" ON actividades;
CREATE POLICY "actividades_authenticated_write" ON actividades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── residentes ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "residentes_authenticated_select" ON residentes;
CREATE POLICY "residentes_authenticated_select" ON residentes
  FOR SELECT TO authenticated USING (true);

-- ─── tutoriales ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tutoriales_select" ON tutoriales;
DROP POLICY IF EXISTS "tutoriales_anon_select" ON tutoriales;
DROP POLICY IF EXISTS "tutoriales_authenticated_all" ON tutoriales;
CREATE POLICY "tutoriales_anon_select" ON tutoriales FOR SELECT TO anon USING (activo = true);
CREATE POLICY "tutoriales_authenticated_all" ON tutoriales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── pasos_tutorial ──────────────────────────────────────────────────────────
ALTER TABLE pasos_tutorial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pasos_tutorial_anon_select" ON pasos_tutorial;
DROP POLICY IF EXISTS "pasos_tutorial_authenticated_all" ON pasos_tutorial;
CREATE POLICY "pasos_tutorial_anon_select" ON pasos_tutorial FOR SELECT TO anon USING (true);
CREATE POLICY "pasos_tutorial_authenticated_all" ON pasos_tutorial FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── categorias_tutorial ─────────────────────────────────────────────────────
ALTER TABLE categorias_tutorial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_tutorial_select" ON categorias_tutorial;
DROP POLICY IF EXISTS "categorias_tutorial_authenticated_write" ON categorias_tutorial;
CREATE POLICY "categorias_tutorial_select" ON categorias_tutorial FOR SELECT USING (true);
CREATE POLICY "categorias_tutorial_authenticated_write" ON categorias_tutorial FOR ALL TO authenticated USING (true) WITH CHECK (true);
