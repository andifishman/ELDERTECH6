import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import type { AuthProfile, Interes, CiudadFamiliar } from '@/types/auth.types';

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(
  usernameOrEmail: string,
  password: string,
): Promise<void> {
  const input = usernameOrEmail.trim();

  // Si parece un email, ir directo sin resolver username
  if (input.includes('@')) {
    const { error } = await supabase.auth.signInWithPassword({
      email: input.toLowerCase(),
      password,
    });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Usuario o contraseña incorrectos. Intentá de nuevo.');
      }
      throw new Error(error.message);
    }
    return;
  }

  // Es un username — resolver a email
  const { data: resolved, error: lookupError } = await supabase.rpc(
    'get_email_by_username',
    { p_username: input },
  );
  if (lookupError || !resolved) {
    throw new Error('Usuario no encontrado. Revisá el nombre de usuario.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: resolved,
    password,
  });
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Usuario o contraseña incorrectos. Intentá de nuevo.');
    }
    throw new Error(error.message);
  }
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  // scope: 'local' clears session instantly without a network request —
  // avoids race conditions where NavigationGuard sees a still-active session
  await supabase.auth.signOut({ scope: 'local' });
}

// ─── Profile ─────────────────────────────────────────────────────────────────

/**
 * Versión rápida: usa el userId de la sesión ya disponible localmente
 * sin hacer un roundtrip extra a getUser().
 *
 * Intenta traer perfil + residente + intereses en UNA sola consulta con
 * joins anidados (1 roundtrip en vez de 2 secuenciales — el perfil bloquea
 * toda la app, así que cada roundtrip ahorrado se nota). Si PostgREST no
 * resuelve la relación, cae al método clásico de 2 pasos.
 */
export async function getProfileForUser(userId: string): Promise<AuthProfile | null> {
  // ── Intento 1: joins anidados, un solo roundtrip ──
  type ResidenteJoin = NonNullable<AuthProfile['residente']> & {
    residente_intereses?: Array<{ interes_id: string }>;
  };
  type PerfilJoinRow = AuthProfile['perfil'] & { residente: ResidenteJoin | null };

  try {
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('*, residente:residentes(*, residente_intereses(interes_id))')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const { residente: residenteRaw, ...perfil } = data as unknown as PerfilJoinRow;
      if (!residenteRaw) {
        return { perfil, residente: null, residente_interes_ids: [] };
      }
      const { residente_intereses, ...residente } = residenteRaw;
      return {
        perfil,
        residente,
        residente_interes_ids: (residente_intereses ?? []).map((r) => r.interes_id),
      };
    }
  } catch {
    // FK no detectada por PostgREST — usar el camino clásico
  }

  // ── Fallback: método clásico de 2 pasos ──
  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles_usuario')
    .select('*')
    .eq('id', userId)
    .single();

  if (perfilError || !perfil) return null;

  if (!perfil.residente_id) {
    return { perfil, residente: null, residente_interes_ids: [] };
  }

  const [{ data: residente }, { data: interesesData }] = await Promise.all([
    supabase.from('residentes').select('*').eq('id', perfil.residente_id).single(),
    supabase.from('residente_intereses').select('interes_id').eq('residente_id', perfil.residente_id),
  ]);

  return {
    perfil,
    residente: residente ?? null,
    residente_interes_ids: (interesesData ?? []).map((r: { interes_id: string }) => r.interes_id),
  };
}

// ─── Lookups ─────────────────────────────────────────────────────────────────

export async function getIntereses(): Promise<Interes[]> {
  const { data, error } = await supabase
    .from('intereses')
    .select('id, nombre, emoji')
    .eq('activo', true)
    .order('nombre');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCiudadesFamiliares(): Promise<CiudadFamiliar[]> {
  const { data, error } = await supabase
    .from('ciudades_familiares')
    .select('id, nombre, pais_codigo, orden')
    .eq('activo', true)
    .order('orden');

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Photo picking (usado por contactos, no por el perfil del residente) ──────

export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}
