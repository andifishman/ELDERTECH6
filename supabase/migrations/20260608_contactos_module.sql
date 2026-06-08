-- ============================================================
-- ElderTech — Módulo Llamar
-- Migración: tablas de contactos mejoradas
-- Fecha: 2026-06-08
-- ============================================================

-- ─── 1. Tabla tipos_contacto ─────────────────────────────────────────────────
-- Categorías predefinidas de relación (familiar, médico, cuidador, etc.)
CREATE TABLE IF NOT EXISTS tipos_contacto (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  text NOT NULL UNIQUE,  -- 'Familia', 'Médico', 'Cuidador', 'Amigo', 'Otro'
  emoji   text,                  -- emoji representativo del tipo
  orden   smallint NOT NULL DEFAULT 0
);

-- Seed inicial de tipos
INSERT INTO tipos_contacto (nombre, emoji, orden) VALUES
  ('Familia',   '👨‍👩‍👧‍👦', 1),
  ('Médico',    '🏥',     2),
  ('Cuidador',  '🤝',     3),
  ('Amigo',     '😊',     4),
  ('Otro',      '📋',     5)
ON CONFLICT (nombre) DO NOTHING;

-- ─── 2. Tabla contactos ──────────────────────────────────────────────────────
-- Contactos personales del residente, importados del celular o cargados manualmente
CREATE TABLE IF NOT EXISTS contactos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  residente_id    uuid NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  tipo_contacto_id uuid REFERENCES tipos_contacto(id) ON DELETE SET NULL,

  nombre          text NOT NULL,
  apellido        text,
  telefono        text NOT NULL,               -- número normalizado con código de país
  whatsapp_disponible boolean NOT NULL DEFAULT true,
  foto_url        text,                        -- URL en Supabase Storage o foto de contacto local

  -- Metadata de origen
  origen_contacto text NOT NULL DEFAULT 'manual'
    CHECK (origen_contacto IN ('dispositivo', 'manual')),
  contacto_device_id text,                    -- ID del contacto en el dispositivo (evita duplicados)

  -- Ordenamiento y estado
  favorito        boolean NOT NULL DEFAULT false,
  orden           smallint NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  notas           text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_contactos_residente_id
  ON contactos (residente_id)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_contactos_favorito
  ON contactos (residente_id, favorito)
  WHERE activo = true AND favorito = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contactos_device_id
  ON contactos (residente_id, contacto_device_id)
  WHERE contacto_device_id IS NOT NULL AND activo = true;

-- ─── 3. Trigger updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_contactos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contactos_updated_at ON contactos;
CREATE TRIGGER trg_contactos_updated_at
  BEFORE UPDATE ON contactos
  FOR EACH ROW EXECUTE FUNCTION update_contactos_updated_at();

-- ─── 4. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_contacto ENABLE ROW LEVEL SECURITY;

-- tipos_contacto: lectura pública para usuarios autenticados
DROP POLICY IF EXISTS "tipos_contacto_select" ON tipos_contacto;
CREATE POLICY "tipos_contacto_select"
  ON tipos_contacto FOR SELECT
  TO authenticated
  USING (true);

-- contactos: el residente solo ve y modifica sus propios contactos
-- Función auxiliar: obtiene el residente_id del usuario actual
CREATE OR REPLACE FUNCTION get_mi_residente_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT residente_id
  FROM perfiles_usuario
  WHERE id = auth.uid()
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "contactos_select_propio" ON contactos;
CREATE POLICY "contactos_select_propio"
  ON contactos FOR SELECT
  TO authenticated
  USING (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "contactos_insert_propio" ON contactos;
CREATE POLICY "contactos_insert_propio"
  ON contactos FOR INSERT
  TO authenticated
  WITH CHECK (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "contactos_update_propio" ON contactos;
CREATE POLICY "contactos_update_propio"
  ON contactos FOR UPDATE
  TO authenticated
  USING (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "contactos_delete_propio" ON contactos;
CREATE POLICY "contactos_delete_propio"
  ON contactos FOR DELETE
  TO authenticated
  USING (residente_id = get_mi_residente_id());

-- ─── 5. Storage bucket para fotos de contactos ───────────────────────────────
-- Ejecutar en el dashboard de Supabase Storage si no existe:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('fotos-contactos', 'fotos-contactos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Policy de storage para fotos de contactos (acceso autenticado)
-- Crear en Supabase Dashboard > Storage > fotos-contactos > Policies

-- ─── 6. Datos de ejemplo para desarrollo ─────────────────────────────────────
-- (Solo correr en entornos de desarrollo — comentar en producción)
-- INSERT INTO contactos (residente_id, nombre, apellido, telefono, whatsapp_disponible, favorito, orden)
-- SELECT
--   r.id,
--   nombres.nombre,
--   'García',
--   '+549' || (11000000000 + floor(random() * 89999999)::int)::text,
--   true,
--   (idx = 1),
--   idx
-- FROM residentes r,
--      unnest(ARRAY['María', 'Carlos', 'Ana', 'Roberto']) WITH ORDINALITY AS nombres(nombre, idx)
-- WHERE r.activo = true
-- LIMIT 4;
