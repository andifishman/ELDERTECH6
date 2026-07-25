-- ─── 1. Simplificar RLS de catálogos: cualquier usuario autenticado puede crear/editar
--        (el backoffice ya requiere login — la autenticación ES el control de acceso)

DROP POLICY IF EXISTS "tipos_actividad_insert" ON tipos_actividad;
CREATE POLICY "tipos_actividad_insert" ON tipos_actividad
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tipos_actividad_update" ON tipos_actividad;
CREATE POLICY "tipos_actividad_update" ON tipos_actividad
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "tipos_actividad_delete" ON tipos_actividad;
CREATE POLICY "tipos_actividad_delete" ON tipos_actividad
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "ubicaciones_insert" ON ubicaciones;
CREATE POLICY "ubicaciones_insert" ON ubicaciones
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ubicaciones_update" ON ubicaciones;
CREATE POLICY "ubicaciones_update" ON ubicaciones
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "ubicaciones_delete" ON ubicaciones;
CREATE POLICY "ubicaciones_delete" ON ubicaciones
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "responsables_insert" ON responsables;
CREATE POLICY "responsables_insert" ON responsables
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "responsables_update" ON responsables;
CREATE POLICY "responsables_update" ON responsables
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "responsables_delete" ON responsables;
CREATE POLICY "responsables_delete" ON responsables
  FOR DELETE TO authenticated USING (true);

-- ─── 2. Agregar columna plantilla_id a actividades (sin FK para evitar conflictos)
ALTER TABLE actividades
  ADD COLUMN IF NOT EXISTS plantilla_id uuid DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_actividades_plantilla
  ON actividades(plantilla_id) WHERE plantilla_id IS NOT NULL;

-- ─── 3. Función para generar ocurrencias de una actividad recurrente
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

  IF v_act.patron_recurrencia->>'hasta' IS NOT NULL THEN
    v_fin := (v_act.patron_recurrencia->>'hasta')::date;
  ELSE
    v_fin := v_act.fecha + interval '1 year';
  END IF;

  -- Borrar SOLO las ocurrencias generadas (nunca la plantilla)
  DELETE FROM actividades
  WHERE plantilla_id = p_plantilla_id
    AND id != p_plantilla_id;

  -- Generar una fila por ocurrencia desde el día siguiente a la plantilla
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

-- ─── 4. Generar ocurrencias para todas las actividades recurrentes existentes
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
    -- Marcar la fila como plantilla (self-reference)
    UPDATE actividades SET plantilla_id = r.id WHERE id = r.id;
    -- Generar todas las ocurrencias futuras
    PERFORM generar_ocurrencias_actividad(r.id);
  END LOOP;
END;
$$;

-- ─── 5. RLS para actividades: permitir SELECT de ocurrencias generadas
-- Las policies existentes sobre actividades ya usan organizacion_id, lo cual cubre
-- tanto las plantillas como las ocurrencias (todas tienen organizacion_id).
