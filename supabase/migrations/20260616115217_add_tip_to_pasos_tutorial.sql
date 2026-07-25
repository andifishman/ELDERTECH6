-- Agrega un consejo opcional por paso (cartel ámbar "tip" del diseño de Tutoriales)
ALTER TABLE public.pasos_tutorial
  ADD COLUMN IF NOT EXISTS tip text;

COMMENT ON COLUMN public.pasos_tutorial.tip IS 'Consejo opcional mostrado en un cartel destacado debajo del paso';
