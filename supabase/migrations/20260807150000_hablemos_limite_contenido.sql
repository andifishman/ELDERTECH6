-- Límite de largo para el contenido de un mensaje de texto de Hablemos.
-- Ya se valida en el cliente (maxLength) y en el backend (zod, máx. 2000) —
-- este constraint es la última capa: si algún día se agrega otra vía de
-- escritura (script, migración de datos, bug en la validación de arriba),
-- la base sigue protegida de una fila que rompa la app al renderizarla.
alter table public.mensajes_hablemos
  add constraint mensajes_hablemos_contenido_largo_check
  check (contenido is null or char_length(contenido) <= 2000);
