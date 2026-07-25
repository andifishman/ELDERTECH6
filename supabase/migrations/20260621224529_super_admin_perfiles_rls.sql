-- Permite a los super-admins ver todos los perfiles de usuario
CREATE POLICY "super_admin_select_all"
ON perfiles_usuario FOR SELECT
USING (
  (auth.jwt() ->> 'email') IN ('andresfishman@gmail.com', 'eldertech6@gmail.com')
);

-- Permite a los super-admins cambiar el rol de otros usuarios
-- (excepto el propio y el del otro super-admin)
CREATE POLICY "super_admin_update_others"
ON perfiles_usuario FOR UPDATE
USING (
  (auth.jwt() ->> 'email') IN ('andresfishman@gmail.com', 'eldertech6@gmail.com')
  AND id NOT IN (
    'b035a808-2a4b-4296-9a69-76ac491b1367',
    '9cb4b7a5-759b-432d-a805-bd4722954c88'
  )
)
WITH CHECK (
  (auth.jwt() ->> 'email') IN ('andresfishman@gmail.com', 'eldertech6@gmail.com')
);
