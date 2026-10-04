-- ============================================================
-- ElderTech — Revierte 20261004120000_tutoriales_v2_imagenes_pasos
-- Las fotos temáticas de loremflickr no tenían relación con cada paso, así
-- que se quitan. Solo borra las URLs de loremflickr de los pasos de la
-- biblioteca v2; no toca imágenes cargadas a mano desde el backoffice.
-- Fecha: 2026-10-04
-- ============================================================

UPDATE pasos_tutorial
SET imagen_url = NULL
WHERE imagen_url LIKE 'https://loremflickr.com/%';
