-- ============================================================
-- ElderTech — Actividades Multi-Row (recurrencia por fila)
-- Fecha: 2026-06-30
-- IMPORTANTE: Correr en Supabase Dashboard → SQL Editor
-- ============================================================
--
-- Estrategia: en vez de una sola fila con `es_recurrente = true`
-- (que el APK no puede expandir), ahora cada ocurrencia tiene
-- su propia fila con `fecha` exacta.
-- La fila "plantilla" tiene `plantilla_id = id` (auto-referencia).
-- Las ocurrencias tienen `plantilla_id = <id de la plantilla>`.
-- El APK existente consulta `.eq('fecha', hoy)` y ya encuentra
-- las ocurrencias sin cambiar nada del APK.
-- ============================================================

-- PASO 1: Agregar columna plantilla_id (sin FK para simplificar)
ALTER TABLE actividades
  ADD COLUMN IF NOT EXISTS plantilla_id uuid DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_actividades_plantilla
  ON actividades(plantilla_id) WHERE plantilla_id IS NOT NULL;

-- PASO 2: Función para generar/regenerar las ocurrencias de una plantilla
CREATE OR REPLACE FUNCTION generar_ocurrencias_actividad(p_plantilla_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_act    actividades%ROWTYPE;
  v_dias   int[];
  v_cursor date;
  v_fin    date;
  v_count  int := 0;
BEGIN
  SELECT * INTO v_act FROM actividades WHERE id = p_plantilla_id;
  IF NOT FOUND OR NOT v_act.es_recurrente THEN RETURN; END IF;

  v_dias := ARRAY(
    SELECT (jsonb_array_elements_text(v_act.patron_recurrencia->'dias_semana'))::int
  );
  IF array_length(v_dias, 1) IS NULL THEN RETURN; END IF;

  -- Fecha límite: campo "hasta" del patrón, o 1 año desde la fecha de inicio
  IF v_act.patron_recurrencia->>'hasta' IS NOT NULL THEN
    v_fin := (v_act.patron_recurrencia->>'hasta')::date;
  ELSE
    v_fin := v_act.fecha + interval '1 year';
  END IF;

  -- Borrar SOLO las ocurrencias (id distinto a la plantilla), nunca la plantilla misma
  DELETE FROM actividades
  WHERE plantilla_id = p_plantilla_id
    AND id != p_plantilla_id;

  -- Generar una fila por ocurrencia, empezando el día siguiente a la plantilla
  v_cursor := v_act.fecha + interval '1 day';
  WHILE v_cursor <= v_fin AND v_count < 365 LOOP
    IF EXTRACT(DOW FROM v_cursor)::int = ANY(v_dias) THEN
      INSERT INTO actividades (
        organizacion_id, tipo_actividad_id, ubicacion_id, responsable_id,
        nombre, descripcion, emoji_icono,
        fecha, hora_inicio, hora_fin,
        es_recurrente, patron_recurrencia,
        pisos_objetivo, activo, plantilla_id
      ) VALUES (
        v_act.organizacion_id, v_act.tipo_actividad_id, v_act.ubicacion_id, v_act.responsable_id,
        v_act.nombre, v_act.descripcion, v_act.emoji_icono,
        v_cursor, v_act.hora_inicio, v_act.hora_fin,
        true, v_act.patron_recurrencia,
        v_act.pisos_objetivo, v_act.activo, p_plantilla_id
      );
      v_count := v_count + 1;
    END IF;
    v_cursor := v_cursor + interval '1 day';
  END LOOP;
END;
$$;

-- PASO 3: Generar ocurrencias para todas las actividades recurrentes existentes
-- (Solo las que NO tienen plantilla_id ya asignado)
DO $$
DECLARE
  r actividades%ROWTYPE;
BEGIN
  FOR r IN
    SELECT * FROM actividades
    WHERE es_recurrente = true
      AND activo = true
      AND plantilla_id IS NULL
    ORDER BY fecha
  LOOP
    -- Marcar la fila existente como plantilla (plantilla_id = su propio id)
    UPDATE actividades SET plantilla_id = r.id WHERE id = r.id;
    -- Generar todas las ocurrencias (la plantilla queda protegida por "id != p_plantilla_id")
    PERFORM generar_ocurrencias_actividad(r.id);
  END LOOP;
END;
$$;

-- PASO 4: RLS — permitir SELECT de todas las filas (plantillas + ocurrencias)
-- Las políticas existentes sobre "actividades" ya cubren esto si usan organizacion_id.
-- Solo es necesario si hay policies que filtran por plantilla_id = NULL:
-- (Normalmente no es necesario, pero verificar en caso de error 403)
