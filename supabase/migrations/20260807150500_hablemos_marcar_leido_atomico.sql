-- `marcarLeidos` hacía dos UPDATEs separados: marcar mensajes como 'leido' y
-- después un SET no_leidos_count = 0 (valor absoluto, no una resta). Si un
-- mensaje nuevo llegaba justo entre esos dos pasos, el trigger de inserción ya
-- había sumado +1 al contador, pero el SET a 0 lo pisaba igual — el badge de
-- "no leídos" quedaba en 0 aunque hubiera un mensaje genuinamente sin leer.
-- Con esta función, todo pasa en una sola transacción y el contador se resta
-- (nunca un SET absoluto), así que un incremento concurrente sobrevive.
create or replace function public.hablemos_marcar_leidos(p_conversacion_id uuid, p_residente_id uuid)
returns void language plpgsql as $$
declare
  v_marcados integer;
begin
  with actualizados as (
    update public.mensajes_hablemos
    set estado = 'leido', leido_en = now()
    where conversacion_id = p_conversacion_id
      and remitente_id <> p_residente_id
      and estado <> 'leido'
    returning 1
  )
  select count(*) into v_marcados from actualizados;

  update public.conversacion_participantes
  set no_leidos_count = greatest(no_leidos_count - v_marcados, 0)
  where conversacion_id = p_conversacion_id
    and residente_id = p_residente_id;
end;
$$;
