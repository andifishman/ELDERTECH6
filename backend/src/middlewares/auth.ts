import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logging/logger';
import { getSupabaseAdmin } from '../repositories/supabaseAdmin';
import { esCuentaSuperAdmin } from '../config/superAdmins';
import { StatusCodes } from 'http-status-codes';
import * as organizacionesRepo from '../repositories/organizacionesRepository';

export interface AuthUser {
  supabaseUserId: string;
  email: string | null;
  residenteId: string | null;
  organizacionId: string | null;
  rol: 'residente' | 'admin' | 'staff' | 'familiar' | null;
  /** false = cuenta deshabilitada: no puede usar el backoffice aunque tenga rol admin/staff. */
  activo: boolean;
  /** Cuenta del allowlist de super-admins — ver `config/superAdmins.ts`. Bypassa el chequeo de `rol`. */
  isSuperAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Instituciones ya validadas (id → vence en ms): evita una consulta por request cuando el super admin tiene elegida otra. */
export const ORGANIZACIONES_VALIDAS = new Map<string, number>();
const VIGENCIA_MS = 60_000;

/**
 * Solo un super admin puede operar sobre OTRA institución que la suya: manda el header `X-Organizacion-Id` desde el selector
 * del backoffice y todo el backend (que resuelve la institución desde `req.user.organizacionId`) trabaja sobre esa. Para
 * cualquier otra cuenta el header se ignora. Si la institución no existe o está inactiva, se ignora también.
 */
export async function organizacionElegida(header: unknown, propia: string | null): Promise<string | null> {
  if (typeof header !== 'string' || !UUID.test(header) || header === propia) return propia;
  const vence = ORGANIZACIONES_VALIDAS.get(header);
  if (vence && vence > Date.now()) return header;
  const existe = await organizacionesRepo.obtenerActiva(header);
  if (!existe) return propia;
  ORGANIZACIONES_VALIDAS.set(header, Date.now() + VIGENCIA_MS);
  return existe.id;
}

/**
 * Verifica el access_token de Supabase preguntándole directo a Supabase Auth
 * quién es (`auth.getUser`), en vez de verificar la firma nosotros mismos con
 * un secreto compartido. Evita tener que adivinar qué esquema de firma usa el
 * proyecto (legado HS256 vs las JWT signing keys asimétricas más nuevas) —
 * Supabase ya sabe cuál es el correcto. Cuesta un roundtrip extra por request,
 * aceptable para esta escala de app.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    logger.warn('requireAuth: falta el header Authorization', { path: req.path });
    res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Falta el header Authorization: Bearer <token>' });
    return;
  }

  const token = header.slice('Bearer '.length);
  const supabase = getSupabaseAdmin();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    logger.warn('requireAuth: auth.getUser rechazó el token', {
      path: req.path,
      reason: userError?.message,
    });
    res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Token inválido o expirado' });
    return;
  }

  const { data, error } = await supabase
    .from('perfiles_usuario')
    .select('residente_id, organizacion_id, rol, activo')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'No se pudo resolver el perfil del usuario' });
    return;
  }

  const email = userData.user.email ?? null;
  const esSuperAdmin = esCuentaSuperAdmin(userData.user.id, email);
  const organizacionPropia: string | null = data?.organizacion_id ?? null;
  const organizacionActiva = esSuperAdmin ? await organizacionElegida(req.headers['x-organizacion-id'], organizacionPropia) : organizacionPropia;

  req.user = {
    supabaseUserId: userData.user.id,
    email,
    residenteId: data?.residente_id ?? null,
    organizacionId: organizacionActiva,
    rol: (data?.rol as AuthUser['rol']) ?? null,
    activo: data?.activo !== false,
    isSuperAdmin: esSuperAdmin,
  };
  next();
}

/**
 * Para rutas /api/admin/* — exige rol admin/staff, o ser una cuenta del
 * allowlist de super-admins. Esto último es necesario porque las cuentas
 * super-admin de este proyecto tienen `perfiles_usuario.rol = 'residente'`
 * (su acceso total viene 100% del email, nunca de esa columna — mismo
 * mecanismo que ya usaba el backoffice antes de esta migración).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // Cuenta deshabilitada (perfiles_usuario.activo = false): fuera, sin importar el rol.
  // El super admin por allowlist no se puede bloquear desde la base.
  if (req.user && !req.user.isSuperAdmin && !req.user.activo) {
    res.status(StatusCodes.FORBIDDEN).json({ error: 'Tu cuenta está deshabilitada.' });
    return;
  }
  if (!req.user?.isSuperAdmin && req.user?.rol !== 'admin' && req.user?.rol !== 'staff') {
    res.status(StatusCodes.FORBIDDEN).json({ error: 'No autorizado' });
    return;
  }
  next();
}
