-- Políticas INSERT/UPDATE/DELETE para admins y staff en catálogos

-- tipos_actividad
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
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "tipos_actividad_delete" ON tipos_actividad;
CREATE POLICY "tipos_actividad_delete" ON tipos_actividad
  FOR DELETE TO authenticated
  USING (
    organizacion_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

-- ubicaciones
DROP POLICY IF EXISTS "ubicaciones_select" ON ubicaciones;
CREATE POLICY "ubicaciones_select" ON ubicaciones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ubicaciones_insert" ON ubicaciones;
CREATE POLICY "ubicaciones_insert" ON ubicaciones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "ubicaciones_update" ON ubicaciones;
CREATE POLICY "ubicaciones_update" ON ubicaciones
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "ubicaciones_delete" ON ubicaciones;
CREATE POLICY "ubicaciones_delete" ON ubicaciones
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

-- responsables
DROP POLICY IF EXISTS "responsables_select" ON responsables;
CREATE POLICY "responsables_select" ON responsables
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "responsables_insert" ON responsables;
CREATE POLICY "responsables_insert" ON responsables
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "responsables_update" ON responsables;
CREATE POLICY "responsables_update" ON responsables
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "responsables_delete" ON responsables;
CREATE POLICY "responsables_delete" ON responsables
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol::text IN ('admin', 'staff')
    )
  );
