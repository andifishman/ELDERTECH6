import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

let client: SupabaseClient | null = null;

/**
 * Cliente con la service-role key — SOLO se usa server-side. Reemplaza la
 * dependencia en RLS+anon-key que hoy tienen los clientes: el backend decide
 * qué puede leer/escribir cada usuario (vía `req.user` en los controllers),
 * no Postgres RLS.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
