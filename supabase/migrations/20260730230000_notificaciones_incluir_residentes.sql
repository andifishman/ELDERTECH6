-- Permite sumar destinatarios puntuales por fuera del filtro de destino elegido
-- (ej: "por sección 1AC" + agregar a mano a alguien de otra sección), simétrico
-- a excluir_residente_ids que ya permitía sacar puntualmente.
alter table public.notifications
  add column if not exists incluir_residente_ids uuid[];
