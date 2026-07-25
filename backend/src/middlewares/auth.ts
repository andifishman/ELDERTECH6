import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logging/logger';
import { getSupabaseAdmin } from '../repositories/supabaseAdmin';

export interface AuthUser {
  supabaseUserId: string;
  email: string | null;
  residenteId: string | null;
  organizacionId: string | null;
  rol: 'residente' | 'admin' | 'staff' | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
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
    res.status(401).json({ error: 'Falta el header Authorization: Bearer <token>' });
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
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }

  const { data, error } = await supabase
    .from('perfiles_usuario')
    .select('residente_id, organizacion_id, rol')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: 'No se pudo resolver el perfil del usuario' });
    return;
  }

  req.user = {
    supabaseUserId: userData.user.id,
    email: userData.user.email ?? null,
    residenteId: data?.residente_id ?? null,
    organizacionId: data?.organizacion_id ?? null,
    rol: (data?.rol as AuthUser['rol']) ?? null,
  };
  next();
}

/** Para rutas /api/admin/* — exige rol admin o staff, además de estar autenticado. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.rol !== 'admin' && req.user?.rol !== 'staff') {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }
  next();
}
