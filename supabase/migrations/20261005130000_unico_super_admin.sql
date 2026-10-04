-- Un único Super Super Admin: eldertech6@gmail.com.
-- Reemplaza las políticas de super_admin_perfiles_rls (que listaban dos emails)
-- para que solo esa cuenta pueda ver todos los perfiles y cambiar roles.
-- El resto de la lista (backend/src/config/superAdmins.ts, backoffice AuthContext
-- y la Edge Function admin-usuarios) se actualizó en el mismo cambio.

drop policy if exists "super_admin_select_all" on public.perfiles_usuario;
create policy "super_admin_select_all"
on public.perfiles_usuario for select
using ((auth.jwt() ->> 'email') = 'eldertech6@gmail.com');

drop policy if exists "super_admin_update_others" on public.perfiles_usuario;
create policy "super_admin_update_others"
on public.perfiles_usuario for update
using (
  (auth.jwt() ->> 'email') = 'eldertech6@gmail.com'
  and id <> '9cb4b7a5-759b-432d-a805-bd4722954c88'
)
with check ((auth.jwt() ->> 'email') = 'eldertech6@gmail.com');
