-- Función SECURITY DEFINER para verificar rol sin RLS bloqueando el subquery
CREATE OR REPLACE FUNCTION auth_es_admin_o_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfiles_usuario
    WHERE id = auth.uid()
      AND rol::text IN ('admin', 'staff')
  );
$$;

-- Reemplazar políticas de tipos_actividad usando la función
DROP POLICY IF EXISTS "tipos_actividad_insert" ON tipos_actividad;
CREATE POLICY "tipos_actividad_insert" ON tipos_actividad
  FOR INSERT TO authenticated
  WITH CHECK (auth_es_admin_o_staff());

DROP POLICY IF EXISTS "tipos_actividad_update" ON tipos_actividad;
CREATE POLICY "tipos_actividad_update" ON tipos_actividad
  FOR UPDATE TO authenticated
  USING (auth_es_admin_o_staff());

DROP POLICY IF EXISTS "tipos_actividad_delete" ON tipos_actividad;
CREATE POLICY "tipos_actividad_delete" ON tipos_actividad
  FOR DELETE TO authenticated
  USING (auth_es_admin_o_staff());

-- Reemplazar políticas de ubicaciones usando la función
DROP POLICY IF EXISTS "ubicaciones_insert" ON ubicaciones;
CREATE POLICY "ubicaciones_insert" ON ubicaciones
  FOR INSERT TO authenticated
  WITH CHECK (auth_es_admin_o_staff());

DROP POLICY IF EXISTS "ubicaciones_update" ON ubicaciones;
CREATE POLICY "ubicaciones_update" ON ubicaciones
  FOR UPDATE TO authenticated
  USING (auth_es_admin_o_staff());

DROP POLICY IF EXISTS "ubicaciones_delete" ON ubicaciones;
CREATE POLICY "ubicaciones_delete" ON ubicaciones
  FOR DELETE TO authenticated
  USING (auth_es_admin_o_staff());

-- Reemplazar políticas de responsables usando la función
DROP POLICY IF EXISTS "responsables_insert" ON responsables;
CREATE POLICY "responsables_insert" ON responsables
  FOR INSERT TO authenticated
  WITH CHECK (auth_es_admin_o_staff());

DROP POLICY IF EXISTS "responsables_update" ON responsables;
CREATE POLICY "responsables_update" ON responsables
  FOR UPDATE TO authenticated
  USING (auth_es_admin_o_staff());

DROP POLICY IF EXISTS "responsables_delete" ON responsables;
CREATE POLICY "responsables_delete" ON responsables
  FOR DELETE TO authenticated
  USING (auth_es_admin_o_staff());
