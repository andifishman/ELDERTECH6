-- Campo opcional "nombre completo" para un residente/usuario — cuando está
-- cargado, se usa como nombre para mostrar en Hablemos (búsqueda, lista de
-- conversaciones, cabecera del chat, notificaciones push) en vez de la
-- concatenación de nombre + apellido. Si queda vacío, todo sigue funcionando
-- igual que antes (fallback a nombre + apellido).
alter table public.residentes
  add column if not exists nombre_completo text;
