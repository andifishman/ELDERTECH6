-- Cierra la escalada de privilegios en perfiles_usuario / residentes.
--
-- perfil_update_own dejaba a cada usuario editar TODAS las columnas de su fila
-- (rol, activo, residente_id, organizacion_id…): RLS filtra filas, no columnas,
-- así que un residente podía hacerse 'admin'. Ningún cliente escribe estas
-- tablas (la app móvil y el backoffice lo hacen por el backend, que usa la
-- service_role y no pasa por RLS), así que se quita toda escritura para
-- anon/authenticated. La lectura de la propia fila no cambia.
--
-- Es aditiva y reversible: no toca storage, Realtime ni lecturas. El resto del
-- endurecimiento (políticas "authenticated USING (true)", buckets privados)
-- está en supabase/endurecer_rls_y_storage.sql (script manual).

-- Columnas que el código usa y ninguna migración creaba (existían en
-- producción por haberse agregado desde el dashboard).
alter table public.perfiles_usuario add column if not exists nombre_completo text;
alter table public.perfiles_usuario add column if not exists avatar_url text;
alter table public.perfiles_usuario add column if not exists email text;
alter table public.perfiles_usuario add column if not exists ultimo_acceso timestamptz;
alter table public.residentes add column if not exists ultima_conexion timestamptz;

drop policy if exists "perfil_update_own" on public.perfiles_usuario;
drop policy if exists "super_admin_update_others" on public.perfiles_usuario;
revoke insert, update, delete on public.perfiles_usuario from anon, authenticated;

drop policy if exists "residentes_authenticated_write" on public.residentes;
revoke insert, update, delete on public.residentes from anon, authenticated;
