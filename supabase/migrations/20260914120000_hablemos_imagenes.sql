-- Módulo "Hablemos" — agrega mensajes de tipo "imagen" (foto de galería o
-- cámara), mismo patrón que "audio": columna de URL dedicada + constraint que
-- exige que solo el campo correspondiente al tipo esté completo.

alter table public.mensajes_hablemos add column imagen_url text;

-- El constraint viejo no contempla "imagen" — se reemplaza por uno que cubre los 3 tipos.
alter table public.mensajes_hablemos drop constraint mensajes_hablemos_contenido_check;
alter table public.mensajes_hablemos
  add constraint mensajes_hablemos_contenido_check
  check (
    (tipo = 'texto' and contenido is not null and audio_url is null and imagen_url is null)
    or (tipo = 'audio' and audio_url is not null and contenido is null and imagen_url is null)
    or (tipo = 'imagen' and imagen_url is not null and contenido is null and audio_url is null)
  );

alter table public.mensajes_hablemos drop constraint mensajes_hablemos_tipo_check;
alter table public.mensajes_hablemos
  add constraint mensajes_hablemos_tipo_check check (tipo in ('texto', 'audio', 'imagen'));

alter table public.conversaciones drop constraint conversaciones_ultimo_mensaje_tipo_check;
alter table public.conversaciones
  add constraint conversaciones_ultimo_mensaje_tipo_check check (ultimo_mensaje_tipo in ('texto', 'audio', 'imagen'));

-- El preview de "último mensaje" también tiene que reconocer "imagen".
create or replace function public.hablemos_actualizar_ultimo_mensaje()
returns trigger language plpgsql as $$
begin
  update public.conversaciones
  set
    ultimo_mensaje_preview = case
      when new.tipo = 'audio' then '🎤 Nota de voz'
      when new.tipo = 'imagen' then '📷 Foto'
      else new.contenido
    end,
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

-- ─── Storage: fotos del chat ────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hablemos-imagenes', 'hablemos-imagenes', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "hablemos_imagenes_public_read" on storage.objects for select
  using (bucket_id = 'hablemos-imagenes');

create policy "hablemos_imagenes_auth_write" on storage.objects for all to authenticated
  using (bucket_id = 'hablemos-imagenes')
  with check (bucket_id = 'hablemos-imagenes');
