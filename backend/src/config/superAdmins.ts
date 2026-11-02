/**
 * Única definición de "super admin" en el backend. `perfiles_usuario.rol` solo
 * distingue residente/admin/staff — "super admin" no existe como valor de
 * columna, es este allowlist (por id de cuenta o por email).
 *
 * Quien necesite saber si alguien es super admin llama a `esCuentaSuperAdmin`:
 * el middleware de auth, `AccessService` y `AdministradoresService` comparten
 * este mismo predicado. El backoffice NO tiene su propia lista: se lo pregunta
 * al backend (`GET /api/admin/accesos/me` → `isSuperAdmin`).
 *
 * Quedan dos copias que no pueden importar este archivo y hay que mantener a
 * mano si la lista cambia (por eso están marcadas con este mismo nombre):
 *  - la Edge Function `supabase/functions/admin-usuarios` (corre en Deno);
 *  - las políticas RLS `super_admin_*` de `perfiles_usuario` (ver la migración
 *    `20261102120000_perfiles_sin_escritura_cliente.sql`, que las deja sin escritura
 *    desde el cliente: el cambio de rol pasa solo por este backend).
 */
export const SUPER_ADMIN_EMAILS = ['eldertech6@gmail.com'];
export const SUPER_ADMIN_IDS = ['9cb4b7a5-759b-432d-a805-bd4722954c88'];

export function esCuentaSuperAdmin(id: string | null | undefined, email: string | null | undefined): boolean {
  if (id && SUPER_ADMIN_IDS.includes(id)) return true;
  return !!email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
