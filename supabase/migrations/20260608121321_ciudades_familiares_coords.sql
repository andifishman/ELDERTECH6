ALTER TABLE public.ciudades_familiares
  ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lon  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS timezone TEXT;

UPDATE public.ciudades_familiares SET lat=-34.6037, lon=-58.3816, timezone='America/Argentina/Buenos_Aires' WHERE nombre='Buenos Aires';
UPDATE public.ciudades_familiares SET lat=-31.4201, lon=-64.1888, timezone='America/Argentina/Cordoba'        WHERE nombre='Córdoba';
UPDATE public.ciudades_familiares SET lat=-32.9468, lon=-60.6393, timezone='America/Argentina/Cordoba'        WHERE nombre='Rosario';
UPDATE public.ciudades_familiares SET lat=32.0853,  lon=34.7818,  timezone='Asia/Jerusalem'                   WHERE nombre='Tel Aviv';
UPDATE public.ciudades_familiares SET lat=31.7683,  lon=35.2137,  timezone='Asia/Jerusalem'                   WHERE nombre='Jerusalén';
UPDATE public.ciudades_familiares SET lat=25.7617,  lon=-80.1918, timezone='America/New_York'                 WHERE nombre='Miami';
UPDATE public.ciudades_familiares SET lat=40.7128,  lon=-74.0060, timezone='America/New_York'                 WHERE nombre='Nueva York';
