-- "Nota de voz" → "Mensaje de voz": término más claro para adultos mayores.
-- Actualiza el trigger que arma el preview del último mensaje en la lista de
-- conversaciones, y corrige los previews de audio ya guardados.

create or replace function public.hablemos_actualizar_ultimo_mensaje()
returns trigger language plpgsql as $$
begin
  update public.conversaciones
  set
    ultimo_mensaje_preview = case when new.tipo = 'audio' then '🎤 Mensaje de voz' else new.contenido end,
    ultimo_mensaje_tipo = new.tipo,
    ultimo_mensaje_at = new.created_at,
    updated_at = now()
  where id = new.conversacion_id;

  update public.conversacion_participantes
  set no_leidos_count = no_leidos_count + 1
  where conversacion_id = new.conversacion_id
    and residente_id <> new.remitente_id;

  return new;
end;
$$;

update public.conversaciones
set ultimo_mensaje_preview = '🎤 Mensaje de voz'
where ultimo_mensaje_tipo = 'audio'
  and ultimo_mensaje_preview = '🎤 Nota de voz';
