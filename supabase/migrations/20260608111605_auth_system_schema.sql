-- ─── ENUMS ───────────────────────────────────────────────────────────────────
CREATE TYPE public.rol_usuario_enum AS ENUM ('residente', 'admin', 'staff');

-- ─── perfiles_usuario ────────────────────────────────────────────────────────
CREATE TABLE public.perfiles_usuario (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  residente_id    UUID REFERENCES public.residentes(id) ON DELETE SET NULL,
  organizacion_id UUID REFERENCES public.organizaciones(id) ON DELETE CASCADE,
  username        TEXT NOT NULL CHECK (length(trim(username)) >= 3),
  rol             public.rol_usuario_enum NOT NULL DEFAULT 'residente',
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_perfiles_usuario_username ON public.perfiles_usuario (lower(username));
CREATE INDEX idx_perfiles_usuario_residente_id ON public.perfiles_usuario (residente_id);

-- ─── ciudades_familiares ─────────────────────────────────────────────────────
CREATE TABLE public.ciudades_familiares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  pais_codigo TEXT NOT NULL DEFAULT 'AR',
  lat         NUMERIC(9,6),
  lon         NUMERIC(9,6),
  activo      BOOLEAN NOT NULL DEFAULT true,
  orden       INTEGER NOT NULL DEFAULT 0
);

-- ─── residente_ciudades_familiares ───────────────────────────────────────────
CREATE TABLE public.residente_ciudades_familiares (
  residente_id      UUID NOT NULL REFERENCES public.residentes(id) ON DELETE CASCADE,
  ciudad_familiar_id UUID NOT NULL REFERENCES public.ciudades_familiares(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (residente_id, ciudad_familiar_id)
);

CREATE INDEX idx_rcf_residente_id ON public.residente_ciudades_familiares (residente_id);

-- ─── Seed ciudades_familiares ────────────────────────────────────────────────
INSERT INTO public.ciudades_familiares (nombre, pais_codigo, lat, lon, orden) VALUES
  ('Buenos Aires', 'AR', -34.603722, -58.381592, 1),
  ('Córdoba',      'AR', -31.416668, -64.183334, 2),
  ('Rosario',      'AR', -32.944882, -60.963159, 3),
  ('Tel Aviv',     'IL',  32.085300,  34.781769, 4),
  ('Jerusalén',    'IL',  31.768319,  35.213710, 5),
  ('Miami',        'US',  25.774265, -80.193659, 6),
  ('Nueva York',   'US',  40.712776, -74.005974, 7);

-- ─── Storage bucket ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fotos-perfil', 'fotos-perfil', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ─── Helper functions ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.perfiles_usuario p ON p.id = u.id
  WHERE lower(p.username) = lower(trim(p_username))
    AND p.activo = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.username_available(p_username TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.perfiles_usuario
    WHERE lower(username) = lower(trim(p_username))
  );
$$;
GRANT EXECUTE ON FUNCTION public.username_available(TEXT) TO anon, authenticated;

-- ─── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_perfiles_usuario_updated_at
BEFORE UPDATE ON public.perfiles_usuario
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── register_user atomic function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_user(
  p_auth_user_id      UUID,
  p_organizacion_id   UUID,
  p_username          TEXT,
  p_nombre            TEXT,
  p_apellido          TEXT,
  p_fecha_nacimiento  DATE,
  p_foto_url          TEXT,
  p_nivel_dificultad  nivel_dificultad_enum,
  p_email             TEXT,
  p_piso              TEXT,
  p_habitacion        TEXT,
  p_intereses         UUID[],
  p_ciudades_familiares UUID[]
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_residente_id UUID;
  v_interes_id   UUID;
  v_ciudad_id    UUID;
BEGIN
  INSERT INTO public.residentes (
    organizacion_id, nombre, apellido, fecha_nacimiento, foto_url,
    nivel_dificultad, email, piso, habitacion, activo
  ) VALUES (
    p_organizacion_id, p_nombre, p_apellido, p_fecha_nacimiento, p_foto_url,
    p_nivel_dificultad, p_email, p_piso, p_habitacion, true
  ) RETURNING id INTO v_residente_id;

  INSERT INTO public.perfiles_usuario (id, residente_id, organizacion_id, username, rol, activo)
  VALUES (p_auth_user_id, v_residente_id, p_organizacion_id, lower(trim(p_username)), 'residente', true);

  IF p_intereses IS NOT NULL AND array_length(p_intereses, 1) > 0 THEN
    FOREACH v_interes_id IN ARRAY p_intereses LOOP
      INSERT INTO public.residente_intereses (residente_id, interes_id)
      VALUES (v_residente_id, v_interes_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  IF p_ciudades_familiares IS NOT NULL AND array_length(p_ciudades_familiares, 1) > 0 THEN
    FOREACH v_ciudad_id IN ARRAY p_ciudades_familiares LOOP
      INSERT INTO public.residente_ciudades_familiares (residente_id, ciudad_familiar_id)
      VALUES (v_residente_id, v_ciudad_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_residente_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_user(
  UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT, nivel_dificultad_enum,
  TEXT, TEXT, TEXT, UUID[], UUID[]
) TO authenticated;
