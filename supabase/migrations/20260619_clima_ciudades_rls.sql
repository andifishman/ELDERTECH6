-- ============================================================
-- ElderTech — Fix RLS módulo Clima
-- Fecha: 2026-06-19
-- ============================================================
--
-- PROBLEMA QUE RESUELVE:
-- Las ciudades que los residentes agregan en la pantalla de Clima
-- no se guardaban en Supabase (solo en AsyncStorage del dispositivo).
--
-- CAUSAS ENCONTRADAS:
-- 1. ciudades_familiares no tenía política INSERT → resolverCiudadId
--    fallaba al querer insertar ciudades nuevas (silently).
-- 2. La política SELECT existente solo devolvía activo=true.
--    Las ciudades custom se insertan con activo=false → el SELECT
--    previo tampoco las encontraba → intentaba INSERT → unique constraint.
-- 3. rcf_select_own no incluía admins/staff → el backoffice veía
--    siempre "Sin ciudades configuradas" para cualquier residente.
-- ============================================================

-- ── 1. ciudades_familiares: SELECT para autenticados (ve activo=false) ────────
DROP POLICY IF EXISTS "ciudades_auth_select" ON ciudades_familiares;
CREATE POLICY "ciudades_auth_select"
  ON ciudades_familiares FOR SELECT
  TO authenticated
  USING (true);

-- ── 2. ciudades_familiares: INSERT para autenticados ─────────────────────────
DROP POLICY IF EXISTS "ciudades_auth_insert" ON ciudades_familiares;
CREATE POLICY "ciudades_auth_insert"
  ON ciudades_familiares FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 3. residente_ciudades_familiares: SELECT incluye admins/staff ─────────────
DROP POLICY IF EXISTS "rcf_select_own" ON residente_ciudades_familiares;
CREATE POLICY "rcf_select_own"
  ON residente_ciudades_familiares FOR SELECT
  TO authenticated
  USING (
    residente_id IN (
      SELECT residente_id FROM perfiles_usuario WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol IN ('admin', 'staff')
    )
  );