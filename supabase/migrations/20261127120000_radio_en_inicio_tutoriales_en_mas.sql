-- ============================================================
-- ElderTech — Radio pasa a la pantalla de inicio y Tutoriales a "Más"
-- La tarjeta celeste de la Home ahora es "Radio" (antes "Tutoriales"), y
-- "Tutoriales" quedó como tarjeta dentro de "Más" (donde antes estaba Radio).
-- Las guías "Conocé ElderTech" (seed 20260619_tutoriales_eldertech_seed.sql)
-- explicaban el camino viejo: acá se corrige el texto de los pasos que
-- hablan de dónde está cada botón. Solo UPDATE (sin borrar ni renumerar
-- pasos), por título, sobre las guías que no están en la papelera —
-- idempotente: correrla dos veces deja lo mismo.
-- Fecha: 2026-11-27
-- ============================================================

-- ─── "Cómo navegar en ElderTech" ───────────────────────────────────────────
UPDATE tutoriales
SET lo_que_aprenderas = ARRAY[
  'Qué hace cada botón de la pantalla principal',
  'Cómo ir a Actividades, Llamar, Radio y más',
  'Cómo volver a la pantalla de inicio desde cualquier lugar'
]
WHERE titulo = 'Cómo navegar en ElderTech' AND deleted_at IS NULL;

UPDATE pasos_tutorial p
SET titulo = 'Botón celeste: Radio',
    descripcion = 'El botón celeste te lleva a la radio, donde podés escuchar emisoras en vivo en español, hebreo e inglés.',
    tip = 'La radio sigue sonando aunque vayas a otra parte de la app.'
FROM tutoriales t
WHERE p.tutorial_id = t.id
  AND t.titulo = 'Cómo navegar en ElderTech' AND t.deleted_at IS NULL
  AND p.orden = 4;

UPDATE pasos_tutorial p
SET descripcion = 'El botón naranja "Más" abre opciones extras: Clima, Tutoriales (para aprender a usar el celular), Agenda, Sugerencias y Accesibilidad.'
FROM tutoriales t
WHERE p.tutorial_id = t.id
  AND t.titulo = 'Cómo navegar en ElderTech' AND t.deleted_at IS NULL
  AND p.orden = 6;

-- ─── "Cómo escuchar la radio" ──────────────────────────────────────────────
UPDATE pasos_tutorial p
SET titulo = 'Tocá el botón Radio',
    descripcion = 'Desde la pantalla de inicio, tocá el botón celeste "Radio".',
    tip = NULL
FROM tutoriales t
WHERE p.tutorial_id = t.id
  AND t.titulo = 'Cómo escuchar la radio' AND t.deleted_at IS NULL
  AND p.orden = 1;

UPDATE pasos_tutorial p
SET titulo = 'Elegí el idioma o el tipo de radio',
    descripcion = 'Se abre la pantalla de Radio. Arriba podés tocar un idioma (Español, Hebreo, Inglés) o una categoría para ver solo esas emisoras.',
    tip = 'Las radios que marcaste como favoritas aparecen primero.'
FROM tutoriales t
WHERE p.tutorial_id = t.id
  AND t.titulo = 'Cómo escuchar la radio' AND t.deleted_at IS NULL
  AND p.orden = 2;
