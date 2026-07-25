-- Pivot table: activities ↔ interests
CREATE TABLE IF NOT EXISTS public.actividad_intereses (
  actividad_id UUID NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  interes_id   UUID NOT NULL REFERENCES public.intereses(id)  ON DELETE CASCADE,
  PRIMARY KEY (actividad_id, interes_id)
);

CREATE INDEX IF NOT EXISTS idx_act_int_actividad ON public.actividad_intereses (actividad_id);
CREATE INDEX IF NOT EXISTS idx_act_int_interes   ON public.actividad_intereses (interes_id);

-- Piso targeting on activities: NULL = all pisos, array of text values = specific pisos
ALTER TABLE public.actividades
  ADD COLUMN IF NOT EXISTS pisos_objetivo TEXT[];

-- RLS
ALTER TABLE public.actividad_intereses ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "act_int_select" ON public.actividad_intereses
  FOR SELECT TO authenticated USING (true);

-- Admins can insert/update/delete
CREATE POLICY "act_int_admin_write" ON public.actividad_intereses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles_usuario pu
      WHERE pu.id = auth.uid() AND pu.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perfiles_usuario pu
      WHERE pu.id = auth.uid() AND pu.rol = 'admin'
    )
  );
