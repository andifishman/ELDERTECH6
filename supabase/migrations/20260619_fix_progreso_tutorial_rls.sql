-- ============================================================
-- ElderTech — Fix RLS progreso_tutorial para admins
-- Fecha: 2026-06-19
-- ============================================================
--
-- PROBLEMA:
-- La política "progreso_admin_select" usaba rol 'public' (anon)
-- en vez de 'authenticated'. Esto impedía que los admins del
-- backoffice vieran los tutoriales completados de los residentes.
--
-- CAUSA:
-- Al crear la política se usó TO public en vez de TO authenticated.
-- El backoffice usa usuarios autenticados (admin/staff), no anon.
-- ============================================================

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
