-- Deshace supabase/endurecer_rls_y_storage.sql (vuelve al comportamiento anterior,
-- con sus agujeros). Usar solo si algo se rompió y hace falta volver rápido.
begin;

update storage.buckets set public = true
  where id in ('hablemos-audio', 'hablemos-imagenes', 'pedidos-audio');

drop policy if exists "hablemos_audio_public_read"    on storage.objects;
drop policy if exists "hablemos_imagenes_public_read" on storage.objects;
drop policy if exists "pedidos_audio_public_read"     on storage.objects;
create policy "hablemos_audio_public_read"    on storage.objects for select using (bucket_id = 'hablemos-audio');
create policy "hablemos_imagenes_public_read" on storage.objects for select using (bucket_id = 'hablemos-imagenes');
create policy "pedidos_audio_public_read"     on storage.objects for select using (bucket_id = 'pedidos-audio');

drop policy if exists "hablemos_audio_auth_write"    on storage.objects;
drop policy if exists "hablemos_imagenes_auth_write" on storage.objects;
drop policy if exists "pedidos_audio_auth_write"     on storage.objects;
create policy "hablemos_audio_auth_write"    on storage.objects for all to authenticated using (bucket_id = 'hablemos-audio')    with check (bucket_id = 'hablemos-audio');
create policy "hablemos_imagenes_auth_write" on storage.objects for all to authenticated using (bucket_id = 'hablemos-imagenes') with check (bucket_id = 'hablemos-imagenes');
create policy "pedidos_audio_auth_write"     on storage.objects for all to authenticated using (bucket_id = 'pedidos-audio')     with check (bucket_id = 'pedidos-audio');

drop policy if exists "tutorial_videos_backoffice_insert" on storage.objects;
drop policy if exists "tutorial_videos_backoffice_update" on storage.objects;
drop policy if exists "tutorial_videos_backoffice_delete" on storage.objects;
drop policy if exists "tutorial_videos_auth_write"        on storage.objects;
create policy "tutorial_videos_auth_write" on storage.objects for all to authenticated
  using (bucket_id = 'tutorial-videos') with check (bucket_id = 'tutorial-videos');

-- Tablas de contenido: vuelve la política abierta que tenían.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('actividades',         'actividades_authenticated_write'),
      ('audit_logs',          'audit_logs_authenticated'),
      ('tutoriales',          'tutoriales_authenticated_all'),
      ('pasos_tutorial',      'pasos_tutorial_authenticated_all'),
      ('faq_asistente',       'faq_authenticated_all'),
      ('categorias_tutorial', 'categorias_tutorial_authenticated_write')
    ) as v(tabla, politica)
  loop
    if to_regclass('public.' || t.tabla) is not null then
      execute format('drop policy if exists %I on public.%I', t.politica, t.tabla);
      execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t.politica, t.tabla);
    end if;
  end loop;

  if to_regclass('public.residentes') is not null then
    drop policy if exists "residentes_authenticated_select" on public.residentes;
    create policy "residentes_authenticated_select" on public.residentes for select to authenticated using (true);
  end if;
end $$;

commit;
