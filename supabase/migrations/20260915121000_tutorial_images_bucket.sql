-- El bucket `tutorial-images` se venía creando a mano desde el dashboard de
-- Supabase — solo sus políticas RLS estaban versionadas (ver
-- 20260617165400_storage_tutorial_images_policies.sql). Si algún día hay que
-- levantar un ambiente nuevo solo con las migraciones, las subidas de
-- imágenes de tutoriales fallarían con "bucket not found". `on conflict do
-- nothing` hace que esto sea un no-op seguro donde el bucket ya existe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutorial-images',
  'tutorial-images',
  true,
  10485760, -- 10 MB — mismo límite que ya aplica el multer del backend para este endpoint
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
