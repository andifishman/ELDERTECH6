ALTER TABLE faq_asistente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faq_select" ON faq_asistente;
CREATE POLICY "faq_anon_select" ON faq_asistente FOR SELECT TO anon USING (activo = true);
CREATE POLICY "faq_authenticated_all" ON faq_asistente FOR ALL TO authenticated USING (true) WITH CHECK (true);
