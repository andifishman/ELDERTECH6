-- ════════════════════════════════════════════════════════════════════════════
-- Endurecimiento de RLS y Storage — pegar entero en el SQL Editor de Supabase.
--
-- ANTES de pegarlo:
--   1. Desplegar el backend nuevo (el que firma las URLs de audio/fotos). Si los
--      buckets pasan a privados con el backend viejo, los audios dejan de abrir.
--   2. Hacer un backup (Database → Backups) por las dudas.
--
-- Es seguro de correr: va en una transacción (si algo falla, no queda nada a
-- medias), ignora tablas/políticas que no existan y se puede correr dos veces.
-- Para deshacerlo: supabase/revertir_endurecer_rls_y_storage.sql
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- ─── 1. ¿Quién es del backoffice? ───────────────────────────────────────────
-- SECURITY DEFINER para leer perfiles_usuario sin que la propia RLS lo bloquee.
-- La cuenta super admin tiene rol 'residente' en la tabla (su acceso viene del
-- allowlist del backend), por eso se la reconoce también por email.
-- MANTENER EN SYNC con backend/src/config/superAdmins.ts.
create or replace function public.auth_es_backoffice()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (auth.jwt() ->> 'email') = 'eldertech6@gmail.com'
    or exists (
      select 1 from public.perfiles_usuario
      where id = auth.uid() and activo and rol::text in ('admin', 'staff')
    );
$$;
grant execute on function public.auth_es_backoffice() to authenticated;

-- ─── 2. Tablas de contenido ─────────────────────────────────────────────────
-- Hoy cualquier usuario "authenticated" (o sea, cualquier residente) puede leer y
-- escribir estas tablas con la clave pública. La escritura la hace solo el backend
-- (service_role, que no pasa por RLS). El backoffice conserva LECTURA para Realtime.
do $$
declare
  t record;
begin
  -- (tabla, política abierta que se quita, política de lectura solo-backoffice que se crea)
  for t in
    select * from (values
      ('residentes',     'residentes_authenticated_select', 'residentes_backoffice_select'),
      ('actividades',    'actividades_authenticated_write', 'actividades_backoffice_select'),
      ('audit_logs',     'audit_logs_authenticated',        'audit_logs_backoffice_select'),
      ('tutoriales',     'tutoriales_authenticated_all',    'tutoriales_backoffice_select'),
      ('pasos_tutorial', 'pasos_tutorial_authenticated_all','pasos_tutorial_backoffice_select'),
      ('faq_asistente',  'faq_authenticated_all',           'faq_backoffice_select')
    ) as v(tabla, abierta, nueva)
  loop
    if to_regclass('public.' || t.tabla) is not null then
      execute format('drop policy if exists %I on public.%I', t.abierta, t.tabla);
      execute format('drop policy if exists %I on public.%I', t.nueva, t.tabla);
      execute format('create policy %I on public.%I for select to authenticated using (public.auth_es_backoffice())', t.nueva, t.tabla);
    end if;
  end loop;

  -- Solo se quitan (nadie del cliente las usa; el backend escribe con service_role).
  for t in
    select * from (values
      ('residentes',          'residentes_authenticated_write'),
      ('categorias_tutorial', 'categorias_tutorial_authenticated_write'),
      ('tipos_actividad',     'tipos_actividad_insert'),
      ('tipos_actividad',     'tipos_actividad_update'),
      ('tipos_actividad',     'tipos_actividad_delete'),
      ('ubicaciones',         'ubicaciones_insert'),
      ('ubicaciones',         'ubicaciones_update'),
      ('ubicaciones',         'ubicaciones_delete'),
      ('responsables',        'responsables_insert'),
      ('responsables',        'responsables_update'),
      ('responsables',        'responsables_delete')
    ) as v(tabla, politica)
  loop
    if to_regclass('public.' || t.tabla) is not null then
      execute format('drop policy if exists %I on public.%I', t.politica, t.tabla);
    end if;
  end loop;
end $$;

-- ─── 3. Storage ─────────────────────────────────────────────────────────────
-- 3a. Audio/fotos del chat y audios de solicitudes: los sube el backend. Ningún
--     usuario autenticado debe poder escribir ahí.
drop policy if exists "hablemos_audio_auth_write"    on storage.objects;
drop policy if exists "hablemos_imagenes_auth_write" on storage.objects;
drop policy if exists "pedidos_audio_auth_write"     on storage.objects;
drop policy if exists "tutorial_images_auth_write"   on storage.objects;

-- 3b. Esos buckets dejan de ser públicos: la URL "pública" ya no abre. El backend
--     entrega URLs firmadas temporales (backend/src/repositories/storageUrls.ts).
drop policy if exists "hablemos_audio_public_read"    on storage.objects;
drop policy if exists "hablemos_imagenes_public_read" on storage.objects;
drop policy if exists "pedidos_audio_public_read"     on storage.objects;
update storage.buckets set public = false
  where id in ('hablemos-audio', 'hablemos-imagenes', 'pedidos-audio');

-- 3c. Videos de tutoriales: los sube el backoffice directo a Storage (el backend en
--     Vercel no admite ese tamaño). Solo cuentas de backoffice pueden escribir.
drop policy if exists "tutorial_videos_auth_write"        on storage.objects;
drop policy if exists "tutorial_videos_backoffice_insert" on storage.objects;
drop policy if exists "tutorial_videos_backoffice_update" on storage.objects;
drop policy if exists "tutorial_videos_backoffice_delete" on storage.objects;
create policy "tutorial_videos_backoffice_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'tutorial-videos' and public.auth_es_backoffice());
create policy "tutorial_videos_backoffice_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'tutorial-videos' and public.auth_es_backoffice());
create policy "tutorial_videos_backoffice_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tutorial-videos' and public.auth_es_backoffice());

commit;
