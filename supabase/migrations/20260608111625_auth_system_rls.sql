-- ─── RLS ENABLE ──────────────────────────────────────────────────────────────
ALTER TABLE public.perfiles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciudades_familiares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residente_ciudades_familiares ENABLE ROW LEVEL SECURITY;

-- ─── perfiles_usuario ────────────────────────────────────────────────────────
CREATE POLICY "perfil_select_own" ON public.perfiles_usuario FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "perfil_update_own" ON public.perfiles_usuario FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─── ciudades_familiares: public read ────────────────────────────────────────
CREATE POLICY "ciudades_anon_select" ON public.ciudades_familiares FOR SELECT
  USING (activo = true);

-- ─── residente_ciudades_familiares ───────────────────────────────────────────
CREATE POLICY "rcf_select_own" ON public.residente_ciudades_familiares FOR SELECT
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "rcf_insert_own" ON public.residente_ciudades_familiares FOR INSERT
  WITH CHECK (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "rcf_delete_own" ON public.residente_ciudades_familiares FOR DELETE
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));

-- ─── intereses: public read ──────────────────────────────────────────────────
CREATE POLICY "intereses_anon_select" ON public.intereses FOR SELECT USING (activo = true);

-- ─── paises_radio: public read ───────────────────────────────────────────────
CREATE POLICY "paises_radio_anon_select" ON public.paises_radio FOR SELECT USING (activo = true);

-- ─── residentes ──────────────────────────────────────────────────────────────
CREATE POLICY "residentes_select_own" ON public.residentes FOR SELECT
  USING (id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "residentes_update_own" ON public.residentes FOR UPDATE
  USING (id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()))
  WITH CHECK (id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));

-- ─── residente_intereses ─────────────────────────────────────────────────────
CREATE POLICY "ri_select_own" ON public.residente_intereses FOR SELECT
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "ri_insert_own" ON public.residente_intereses FOR INSERT
  WITH CHECK (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "ri_delete_own" ON public.residente_intereses FOR DELETE
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));

-- ─── actividad_residentes ────────────────────────────────────────────────────
CREATE POLICY "ar_select_own" ON public.actividad_residentes FOR SELECT
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));

-- ─── historial_radio ─────────────────────────────────────────────────────────
CREATE POLICY "hr_select_own" ON public.historial_radio FOR SELECT
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "hr_insert_own" ON public.historial_radio FOR INSERT
  WITH CHECK (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));

-- ─── residente_radios_favoritas ──────────────────────────────────────────────
CREATE POLICY "rrf_select_own" ON public.residente_radios_favoritas FOR SELECT
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "rrf_insert_own" ON public.residente_radios_favoritas FOR INSERT
  WITH CHECK (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "rrf_delete_own" ON public.residente_radios_favoritas FOR DELETE
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));

-- ─── eventos_personales ──────────────────────────────────────────────────────
CREATE POLICY "ep_select_own" ON public.eventos_personales FOR SELECT
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "ep_insert_own" ON public.eventos_personales FOR INSERT
  WITH CHECK (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "ep_update_own" ON public.eventos_personales FOR UPDATE
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));
CREATE POLICY "ep_delete_own" ON public.eventos_personales FOR DELETE
  USING (residente_id IN (SELECT residente_id FROM public.perfiles_usuario WHERE id = auth.uid()));

-- ─── Storage policies ────────────────────────────────────────────────────────
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-perfil');
CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-perfil' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos-perfil' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-perfil' AND (storage.foldername(name))[1] = auth.uid()::text);
