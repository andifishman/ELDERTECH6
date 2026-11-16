-- ============================================================
-- Mi familia: el residente puede contestar con notas de voz.
--
-- Muchos residentes no pueden escribir, así que además de texto/foto el hilo
-- familiar ↔ residente admite audio. Se guarda la RUTA en el bucket privado
-- `familia-mensajes` (igual que las fotos) y el backend la canjea por una URL
-- firmada de 1 hora al entregar el mensaje.
-- ============================================================

alter table public.familia_mensajes
  add column if not exists audio_path text,
  add column if not exists audio_duracion_segundos integer
    check (audio_duracion_segundos is null or audio_duracion_segundos between 1 and 600);

-- Un mensaje tiene que traer algo: texto, foto o audio.
alter table public.familia_mensajes drop constraint if exists familia_mensajes_con_contenido;
alter table public.familia_mensajes
  add constraint familia_mensajes_con_contenido
  check (contenido is not null or imagen_path is not null or audio_path is not null);

-- El bucket de mensajes ahora también acepta audio (m4a/mp4 en la app, webm/ogg/mp3/wav en navegadores).
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav'
    ]
where id = 'familia-mensajes';
