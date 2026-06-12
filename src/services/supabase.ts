//inicializa y exporta el cliente de Supabase para toda la app
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// URL polyfill solo en nativo — en web el navegador ya tiene URL nativo
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

//lee las variables de entorno definidas en .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Error claro en vez del crash críptico de createClient(undefined)
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copiá .env.example a .env y completá los valores (después reiniciá expo start).',
  );
}

// En web: storage undefined → Supabase usa localStorage nativo (sin capa async intermediaria)
// En nativo: AsyncStorage para persistencia en el dispositivo
const authStorage = Platform.OS === 'web' ? undefined : AsyncStorage;

//crea el cliente de supabase con sesión persistente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

//id de la organización activa — se usa en todas las queries para filtrar datos
export const ORG_ID = process.env.EXPO_PUBLIC_ORG_ID ?? '';
