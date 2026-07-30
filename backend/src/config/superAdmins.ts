/**
 * Cuentas con acceso total al backoffice, independientemente de `perfiles_usuario.rol`.
 * `rol` en la DB solo distingue residente/admin/staff — "super admin" no existe como
 * valor de columna, es puramente este allowlist (mismo mecanismo que ya usaba
 * `backoffice/src/features/auth/AuthContext.tsx` y la Edge Function `admin-usuarios`).
 * Duplicado a propósito acá (Node) porque la Edge Function corre en Deno — mantener
 * los tres en sync si cambia. Candidato a reemplazar por una columna real más adelante.
 */
export const SUPER_ADMIN_EMAILS = ['andresfishman@gmail.com', 'eldertech6@gmail.com'];
export const SUPER_ADMIN_IDS = ['b035a808-2a4b-4296-9a69-76ac491b1367', '9cb4b7a5-759b-432d-a805-bd4722954c88'];
