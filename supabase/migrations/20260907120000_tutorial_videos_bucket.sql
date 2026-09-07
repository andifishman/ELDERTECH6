-- Bucket para archivos de video de tutoriales, subidos directo desde el
-- backoffice (ver backoffice/src/services/articulosService.ts) — hasta ahora
-- el campo "Video" del formulario de tutoriales era solo un texto libre para
-- pegar una URL, sin ninguna forma real de subir un archivo. Mismo patrón que
-- 'hablemos-audio' (bucket + políticas en una sola migración versionada, en
-- vez de crear el bucket a mano desde el dashboard).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutorial-videos',
  'tutorial-videos',
  true,
  209715200, -- 200 MB — alcanza para un tutorial de varios minutos bien comprimido
  array['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp']
)
on conflict (id) do nothing;

create policy "tutorial_videos_public_read" on storage.objects for select using (bucket_id = 'tutorial-videos');

create policy "tutorial_videos_auth_write" on storage.objects for all to authenticated using (bucket_id = 'tutorial-videos') with check (bucket_id = 'tutorial-videos');
