// ========================================
// LIB: Cliente Supabase
// DESCRIPCIÓN:
// Inicializa el cliente de Supabase para el backoffice.
// Apunta a la MISMA base de datos que la app móvil, de
// modo que cualquier cambio impacta en tiempo real en
// los dispositivos de los residentes.
// ========================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Error claro en desarrollo si falta configuración
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env y completá los valores de Supabase.',
  );
}

// Cliente único para toda la app — sesión persistente en localStorage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ID de la organización activa (geriátrico). Filtra todas las queries.
// En el futuro vendrá del perfil del admin autenticado.
export const ORG_ID = (import.meta.env.VITE_ORG_ID as string) ?? '';
