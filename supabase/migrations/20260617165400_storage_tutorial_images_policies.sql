DROP POLICY IF EXISTS "tutorial_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "tutorial_images_auth_write" ON storage.objects;

CREATE POLICY "tutorial_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'tutorial-images');

CREATE POLICY "tutorial_images_auth_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'tutorial-images')
  WITH CHECK (bucket_id = 'tutorial-images');
