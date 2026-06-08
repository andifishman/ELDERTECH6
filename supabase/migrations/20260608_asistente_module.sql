-- ============================================================
-- ElderTech — Módulo Asistente
-- Migración: tablas de chat, FAQ y favoritos del asistente
-- Fecha: 2026-06-08
-- ============================================================

-- ─── 1. Sesiones del asistente ───────────────────────────────────────────────
-- Una sesión agrupa una conversación. Cada vez que el usuario abre el chat
-- y manda el primer mensaje, se crea una sesión nueva (o se reutiliza la del día).
CREATE TABLE IF NOT EXISTS sesiones_asistente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  residente_id    uuid NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  titulo          text,                      -- Se genera automáticamente del primer mensaje
  activa          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_residente
  ON sesiones_asistente (residente_id, created_at DESC);

-- ─── 2. Mensajes del asistente ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes_asistente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id       uuid NOT NULL REFERENCES sesiones_asistente(id) ON DELETE CASCADE,
  residente_id    uuid NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  rol             text NOT NULL CHECK (rol IN ('usuario', 'asistente')),
  contenido       text NOT NULL,
  es_favorito     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_sesion
  ON mensajes_asistente (sesion_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_mensajes_favoritos
  ON mensajes_asistente (residente_id, es_favorito)
  WHERE es_favorito = true;

-- ─── 3. FAQ dinámico ─────────────────────────────────────────────────────────
-- Preguntas frecuentes que aparecen como tarjetas en la pantalla principal
CREATE TABLE IF NOT EXISTS faq_asistente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta        text NOT NULL,
  categoria       text NOT NULL DEFAULT 'general',  -- 'whatsapp', 'llamadas', 'fotos', etc.
  emoji           text NOT NULL DEFAULT '❓',
  orden           smallint NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_orden
  ON faq_asistente (orden) WHERE activo = true;

-- Seed: preguntas frecuentes iniciales
INSERT INTO faq_asistente (pregunta, categoria, emoji, orden) VALUES
  ('¿Cómo mando un mensaje por WhatsApp?',    'whatsapp',   '💬', 1),
  ('¿Cómo hago una videollamada?',            'llamadas',   '📹', 2),
  ('¿Cómo veo mis fotos?',                    'fotos',      '📷', 3),
  ('¿Cómo subo el volumen?',                  'celular',    '🔊', 4),
  ('¿Cómo hago una llamada telefónica?',      'llamadas',   '📞', 5),
  ('¿Cómo conecto el WiFi?',                  'internet',   '📶', 6),
  ('¿Cómo uso el clima en la app?',           'eldertech',  '🌤️', 7),
  ('¿Cómo escucho la radio?',                 'eldertech',  '📻', 8),
  ('¿Cómo agrando la letra del celular?',     'celular',    '🔍', 9),
  ('¿Cómo cargo la batería correctamente?',   'celular',    '🔋', 10)
ON CONFLICT DO NOTHING;

-- ─── 4. Triggers updated_at ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_asistente_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sesiones_updated_at ON sesiones_asistente;
CREATE TRIGGER trg_sesiones_updated_at
  BEFORE UPDATE ON sesiones_asistente
  FOR EACH ROW EXECUTE FUNCTION update_asistente_updated_at();

-- ─── 5. Row Level Security ───────────────────────────────────────────────────
ALTER TABLE sesiones_asistente  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_asistente  ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_asistente       ENABLE ROW LEVEL SECURITY;

-- FAQ: lectura pública
DROP POLICY IF EXISTS "faq_select" ON faq_asistente;
CREATE POLICY "faq_select" ON faq_asistente
  FOR SELECT TO authenticated USING (activo = true);

-- Sesiones: solo el propio residente
DROP POLICY IF EXISTS "sesiones_select" ON sesiones_asistente;
CREATE POLICY "sesiones_select" ON sesiones_asistente
  FOR SELECT TO authenticated USING (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "sesiones_insert" ON sesiones_asistente;
CREATE POLICY "sesiones_insert" ON sesiones_asistente
  FOR INSERT TO authenticated WITH CHECK (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "sesiones_update" ON sesiones_asistente;
CREATE POLICY "sesiones_update" ON sesiones_asistente
  FOR UPDATE TO authenticated USING (residente_id = get_mi_residente_id());

-- Mensajes: solo el propio residente
DROP POLICY IF EXISTS "mensajes_select" ON mensajes_asistente;
CREATE POLICY "mensajes_select" ON mensajes_asistente
  FOR SELECT TO authenticated USING (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "mensajes_insert" ON mensajes_asistente;
CREATE POLICY "mensajes_insert" ON mensajes_asistente
  FOR INSERT TO authenticated WITH CHECK (residente_id = get_mi_residente_id());

DROP POLICY IF EXISTS "mensajes_update" ON mensajes_asistente;
CREATE POLICY "mensajes_update" ON mensajes_asistente
  FOR UPDATE TO authenticated USING (residente_id = get_mi_residente_id());
