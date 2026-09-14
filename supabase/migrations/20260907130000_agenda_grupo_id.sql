-- "Agregar a mi agenda" desde Horarios con la opción "todo el mes" crea varias
-- filas (una por día, sin recurrencia real — ver comentario en AgendaTypes.ts).
-- grupo_id agrupa esas filas para poder ofrecer "borrar solo este día" vs
-- "borrar toda la serie" al eliminar. Null para los recordatorios sueltos de
-- siempre (creados desde app/agenda/nuevo.tsx), que no cambian en nada.
alter table public.agenda_recordatorios
  add column if not exists grupo_id uuid;

create index if not exists idx_agenda_recordatorios_grupo_id
  on public.agenda_recordatorios (grupo_id)
  where grupo_id is not null;
