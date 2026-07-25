-- Fix: progreso_admin_select usaba rol 'public' en vez de 'authenticated'
-- Esto impedía que los admins/staff del backoffice vieran el progreso de tutoriales de los residentes

DROP POLICY IF EXISTS "progreso_admin_select" ON progreso_tutorial;

CREATE POLICY "progreso_admin_select"
  ON progreso_tutorial FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol IN ('admin', 'staff')
    )
  );
