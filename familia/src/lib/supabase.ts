// Cliente de Supabase SOLO para el login y la sesión de los familiares. Todo lo demás
// (avisos, fotos, mensajes…) pasa por el backend propio — ver lib/apiClient.ts.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = !!supabaseUrl && !!supabaseAnonKey;

// Con la configuración incompleta no se rompe la carga: la app muestra un cartel claro (ver App.tsx).
export const supabase = createClient(supabaseUrl ?? 'http://localhost:54321', supabaseAnonKey ?? 'sin-configurar', {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});
