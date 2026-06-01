-- ─────────────────────────────────────────────────────────────────────────────
-- supabase_radio_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Tablas para favoritos e historial de radio por residente.
-- NOTA: Este archivo es solo de referencia. NO ejecutar directamente.
--       Aplicar desde el panel SQL de Supabase o con supabase db push.
-- ─────────────────────────────────────────────────────────────────────────────

-- Favoritos de radio (por usuario/residente)
-- Guarda qué radios marcó como favoritas cada residente.
-- radio_id es TEXT (no UUID) para compatibilidad con el fallback hardcodeado.
CREATE TABLE IF NOT EXISTS radio_favoritos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  residente_id UUID        REFERENCES residentes(id) ON DELETE CASCADE,
  radio_id     TEXT        NOT NULL,  -- ID de la radio (string, ej: 'ar-mitre')
  creado_en    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(residente_id, radio_id)
);

-- Historial de radio (por usuario/residente)
-- Registra cada vez que un residente escucha una radio.
-- Se guarda el nombre para poder mostrarlo aunque la radio ya no exista.
CREATE TABLE IF NOT EXISTS radio_historial (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  residente_id UUID        REFERENCES residentes(id) ON DELETE CASCADE,
  radio_id     TEXT        NOT NULL,
  radio_nombre TEXT        NOT NULL,
  escuchado_en TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_radio_historial_residente
  ON radio_historial(residente_id, escuchado_en DESC);

CREATE INDEX IF NOT EXISTS idx_radio_favoritos_residente
  ON radio_favoritos(residente_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) — recomendado para producción
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilitar RLS
ALTER TABLE radio_favoritos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE radio_historial  ENABLE ROW LEVEL SECURITY;

-- Política: cada residente solo ve y modifica sus propios datos
-- (ajustar según el sistema de autenticación de la app)

CREATE POLICY "favoritos_propios" ON radio_favoritos
  FOR ALL USING (residente_id = auth.uid()::uuid);

CREATE POLICY "historial_propio" ON radio_historial
  FOR ALL USING (residente_id = auth.uid()::uuid);
