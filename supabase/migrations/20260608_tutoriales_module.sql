-- ============================================================
-- ElderTech — Módulo Tutoriales
-- Migración completa
-- Fecha: 2026-06-08
-- ============================================================

-- ─── 1. ENUMs ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE formato_tutorial_enum AS ENUM ('video', 'guia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Tabla categorias_tutorial ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias_tutorial (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  text NOT NULL UNIQUE,
  emoji   text,
  orden   smallint NOT NULL DEFAULT 0,
  activo  boolean NOT NULL DEFAULT true
);

INSERT INTO categorias_tutorial (nombre, emoji, orden) VALUES
  ('Todo',           '📚', 0),
  ('WhatsApp',       '💬', 1),
  ('Fotos',          '📷', 2),
  ('Llamadas',       '📞', 3),
  ('Internet',       '🌐', 4),
  ('Seguridad',      '🔒', 5),
  ('Configuración',  '⚙️',  6),
  ('Redes Sociales', '👥', 7)
ON CONFLICT (nombre) DO NOTHING;

-- ─── 3. Tabla tutoriales ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoriales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id    uuid REFERENCES categorias_tutorial(id) ON DELETE SET NULL,

  titulo          text NOT NULL,
  descripcion     text,
  formato         formato_tutorial_enum NOT NULL DEFAULT 'video',

  -- Video
  url_video       text,
  duracion_segundos integer,           -- duración en segundos para calcular "X min"
  thumbnail_url   text,

  -- Metadatos
  lo_que_aprenderas text[],            -- array de puntos: ["Cómo abrir WhatsApp", ...]
  orden           smallint NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tutoriales_categoria
  ON tutoriales (categoria_id) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_tutoriales_orden
  ON tutoriales (orden) WHERE activo = true;

-- Búsqueda full-text en español
CREATE INDEX IF NOT EXISTS idx_tutoriales_fts
  ON tutoriales USING gin(
    to_tsvector('spanish', coalesce(titulo,'') || ' ' || coalesce(descripcion,''))
  );

-- ─── 4. Tabla pasos_tutorial (guías fotográficas) ────────────────────────────
CREATE TABLE IF NOT EXISTS pasos_tutorial (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id  uuid NOT NULL REFERENCES tutoriales(id) ON DELETE CASCADE,
  orden        smallint NOT NULL DEFAULT 0,
  titulo       text,                   -- "Paso 1: Abrir WhatsApp"
  descripcion  text,
  imagen_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pasos_tutorial_id
  ON pasos_tutorial (tutorial_id, orden);

-- ─── 5. Tabla progreso_tutorial (por residente) ──────────────────────────────
-- Guarda favoritos, visto, progreso de video e historial en una sola tabla
CREATE TABLE IF NOT EXISTS progreso_tutorial (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  residente_id     uuid NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  tutorial_id      uuid NOT NULL REFERENCES tutoriales(id) ON DELETE CASCADE,

  favorito         boolean NOT NULL DEFAULT false,
  completado       boolean NOT NULL DEFAULT false,

  -- Progreso de video (segundos vistos)
  segundos_vistos  integer NOT NULL DEFAULT 0,

  -- Historial: última vez que lo abrió
  ultima_vista     timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (residente_id, tutorial_id)
);

CREATE INDEX IF NOT EXISTS idx_progreso_residente
  ON progreso_tutorial (residente_id);

CREATE INDEX IF NOT EXISTS idx_progreso_favoritos
  ON progreso_tutorial (residente_id, favorito)
  WHERE favorito = true;

CREATE INDEX IF NOT EXISTS idx_progreso_historial
  ON progreso_tutorial (residente_id, ultima_vista DESC)
  WHERE ultima_vista IS NOT NULL;

-- ─── 6. Trigger updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tutoriales_updated_at ON tutoriales;
CREATE TRIGGER trg_tutoriales_updated_at
  BEFORE UPDATE ON tutoriales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_progreso_updated_at ON progreso_tutorial;
CREATE TRIGGER trg_progreso_updated_at
  BEFORE UPDATE ON progreso_tutorial
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 7. Row Level Security ───────────────────────────────────────────────────
ALTER TABLE categorias_tutorial  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutoriales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pasos_tutorial       ENABLE ROW LEVEL SECURITY;
ALTER TABLE progreso_tutorial    ENABLE ROW LEVEL SECURITY;

-- Lectura pública para usuarios autenticados
DROP POLICY IF EXISTS "categorias_tutorial_select" ON categorias_tutorial;
CREATE POLICY "categorias_tutorial_select" ON categorias_tutorial
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tutoriales_select" ON tutoriales;
CREATE POLICY "tutoriales_select" ON tutoriales
  FOR SELECT TO authenticated USING (activo = true);

DROP POLICY IF EXISTS "pasos_tutorial_select" ON pasos_tutorial;
CREATE POLICY "pasos_tutorial_select" ON pasos_tutorial
  FOR SELECT TO authenticated USING (true);

-- Progreso: cada residente solo ve y modifica el suyo
DROP POLICY IF EXISTS "progreso_select" ON progreso_tutorial;
CREATE POLICY "progreso_select" ON progreso_tutorial
  FOR SELECT TO authenticated
  USING (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "progreso_insert" ON progreso_tutorial;
CREATE POLICY "progreso_insert" ON progreso_tutorial
  FOR INSERT TO authenticated
  WITH CHECK (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "progreso_update" ON progreso_tutorial;
CREATE POLICY "progreso_update" ON progreso_tutorial
  FOR UPDATE TO authenticated
  USING (residente_id = get_mi_residente_id());

-- ─── 8. Datos de ejemplo ─────────────────────────────────────────────────────
INSERT INTO tutoriales (categoria_id, titulo, descripcion, formato, url_video, duracion_segundos, thumbnail_url, lo_que_aprenderas, orden)
VALUES
(
  (SELECT id FROM categorias_tutorial WHERE nombre = 'WhatsApp'),
  'Cómo enviar un mensaje por WhatsApp',
  'Aprendé a escribirle a tu familia y amigos de forma simple y rápida usando WhatsApp.',
  'video',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  300,
  null,
  ARRAY[
    'Cómo abrir WhatsApp',
    'Cómo buscar un contacto',
    'Cómo escribir un mensaje',
    'Cómo enviarlo',
    'Cómo saber si fue recibido'
  ],
  1
),
(
  (SELECT id FROM categorias_tutorial WHERE nombre = 'Fotos'),
  'Cómo sacar una foto con el celular',
  'Aprendé a usar la cámara de tu teléfono para capturar momentos especiales.',
  'guia',
  null,
  null,
  null,
  ARRAY[
    'Cómo abrir la cámara',
    'Cómo enfocar la foto',
    'Cómo tomar la foto',
    'Dónde se guarda la foto'
  ],
  2
),
(
  (SELECT id FROM categorias_tutorial WHERE nombre = 'WhatsApp'),
  'Cómo enviar una foto por WhatsApp',
  'Compartí tus fotos favoritas con tu familia a través de WhatsApp.',
  'video',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  240,
  null,
  ARRAY[
    'Cómo abrir una conversación',
    'Cómo adjuntar una foto',
    'Cómo elegir la foto',
    'Cómo enviarla'
  ],
  3
)
ON CONFLICT DO NOTHING;

-- Pasos para el tutorial de fotos
INSERT INTO pasos_tutorial (tutorial_id, orden, titulo, descripcion, imagen_url)
SELECT
  t.id,
  s.orden,
  s.titulo,
  s.descripcion,
  null
FROM tutoriales t,
(VALUES
  (1, 'Paso 1: Abrí la app de cámara', 'Buscá el ícono de la cámara en tu teléfono y tocalo.'),
  (2, 'Paso 2: Apuntá al objeto', 'Apuntá el teléfono hacia lo que querés fotografiar.'),
  (3, 'Paso 3: Tocá el botón', 'Tocá el botón redondo grande para sacar la foto.'),
  (4, 'Paso 4: Revisá la foto', 'Tu foto se guarda automáticamente en la galería.')
) AS s(orden, titulo, descripcion)
WHERE t.titulo = 'Cómo sacar una foto con el celular'
ON CONFLICT DO NOTHING;
