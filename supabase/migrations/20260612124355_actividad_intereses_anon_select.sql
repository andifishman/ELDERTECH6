-- Allow anonymous/public users to read actividad_intereses
-- (same pattern as tipos_actividad, ubicaciones, responsables)
-- Needed for web where Supabase may briefly use the anon role during auth init
CREATE POLICY "anon_select" ON public.actividad_intereses
  FOR SELECT
  TO public
  USING (true);
