-- ============================================================
-- ElderTech — Fix RLS módulo Clima
-- ============================================================

-- ── 1. ciudades_familiares: SELECT para autenticados (ve activo=false también) ──
-- La policy existente "ciudades_anon_select" solo devuelve activo=true.
-- Las ciudades custom se insertan con activo=false, por lo que el SELECT
-- de resolverCiudadId no las encontraba → intentaba INSERT → unique constraint.
DROP POLICY IF EXISTS "ciudades_auth_select" ON ciudades_familiares;
CREATE POLICY "ciudades_auth_select"
  ON ciudades_familiares FOR SELECT
  TO authenticated
  USING (true);

-- ── 2. ciudades_familiares: INSERT para autenticados ─────────────────────────
-- Sin esta policy, los residentes no podían agregar ciudades nuevas.
DROP POLICY IF EXISTS "ciudades_auth_insert" ON ciudades_familiares;
CREATE POLICY "ciudades_auth_insert"
  ON ciudades_familiares FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 3. residente_ciudades_familiares: SELECT incluye admins/staff ─────────────
-- La policy anterior solo devolvía filas del propio residente.
-- Los admins del backoffice no tienen residente_id → veían siempre vacío.
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
