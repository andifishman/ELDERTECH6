//inicializa y exporta el cliente de Supabase para toda la app
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

//lee las variables de entorno definidas en .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

//crea el cliente de supabase con sesión persistente en AsyncStorage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

//id de la organización activa — se usa en todas las queries para filtrar datos
export const ORG_ID = process.env.EXPO_PUBLIC_ORG_ID ?? '';
