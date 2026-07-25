DROP POLICY IF EXISTS "residentes_authenticated_write" ON residentes;
CREATE POLICY "residentes_authenticated_write" ON residentes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
