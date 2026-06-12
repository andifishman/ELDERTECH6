import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { supabase, ORG_ID } from './supabase';
import type { RegisterFormData, AuthProfile, Interes, CiudadFamiliar, CiudadCustom } from '@/types/auth.types';
import type { NivelDificultad } from '@/types/database.types';

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
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Necesitás confirmar tu email antes de ingresar. Revisá tu casilla de correo.');
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
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Necesitás confirmar tu email antes de ingresar. Revisá tu casilla de correo.');
    }
    throw new Error(error.message);
  }
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerUser(data: RegisterFormData): Promise<void> {
  // 1. Upload photo first (if provided) — we need a temp path before we have user ID
  //    We'll re-upload after getting the user ID. For now, create the auth user.

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email.trim().toLowerCase(),
    password: data.password,
    options: {
      data: { username: data.username.trim() },
      emailRedirectTo: 'eldertech://verify-email',
    },
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      throw new Error('Este email ya está registrado.');
    }
    throw new Error(signUpError.message);
  }

  if (!authData.user) {
    throw new Error('Este email ya está registrado.');
  }

  const userId = authData.user.id;

  // Supabase no lanza error cuando el email ya existe pero no está confirmado —
  // simplemente reenvía el email de confirmación y devuelve el mismo usuario.
  // Detectamos este caso verificando si ya existe un perfil para ese user ID.
  const { data: existingProfile } = await supabase
    .from('perfiles_usuario')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfile) {
    throw new Error('Este email ya está registrado. Si aún no confirmaste tu cuenta, revisá tu correo.');
  }

  // 2. Upload photo if provided
  let foto_url: string | null = null;
  if (data.foto_uri) {
    try {
      foto_url = await uploadProfilePhoto(userId, data.foto_uri);
    } catch {
      // Non-fatal: continue without photo
    }
  }

  // 3. Parse birth date DD/MM/AAAA → YYYY-MM-DD
  const fechaNacimiento = parseFechaNacimiento(data.fecha_nacimiento);

  // 4. Call atomic register_user function
  const { error: registerError } = await supabase.rpc('register_user', {
    p_auth_user_id: userId,
    p_organizacion_id: ORG_ID,
    p_username: data.username.trim(),
    p_nombre: data.nombre.trim(),
    p_apellido: data.apellido.trim(),
    p_fecha_nacimiento: fechaNacimiento,
    p_foto_url: foto_url,
    p_nivel_dificultad: data.nivel_dificultad as NivelDificultad,
    p_email: data.email.trim().toLowerCase(),
    p_piso: data.piso.trim() || null,
    p_habitacion: data.habitacion.trim() || null,
    p_intereses: data.intereses,
    p_ciudades_familiares: data.ciudades_familiares,
  });

  if (registerError) {
    // Rollback auth user if profile creation fails
    await supabase.auth.signOut();
    if (registerError.message.includes('perfiles_usuario_username')) {
      throw new Error('Ese nombre de usuario ya está en uso. Elegí otro.');
    }
    throw new Error('Error al crear el perfil. Intentá de nuevo.');
  }

  // 5. Save custom cities (searched via Open-Meteo) to ciudades_familiares + residente_ciudades_familiares
  if (data.ciudades_familiares_custom && data.ciudades_familiares_custom.length > 0) {
    try {
      // Fetch the residente_id that was just created
      const { data: perfil } = await supabase
        .from('perfiles_usuario')
        .select('residente_id')
        .eq('id', userId)
        .single();

      const residenteId = perfil?.residente_id;

      if (residenteId) {
        await guardarCiudadesCustom(residenteId, data.ciudades_familiares_custom);
      }
    } catch {
      // Non-fatal: the user is registered, custom cities can be added later
    }
  }
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(usernameOrEmail: string): Promise<void> {
  let email = usernameOrEmail.trim().toLowerCase();

  // If it doesn't look like an email, treat it as username
  if (!email.includes('@')) {
    const { data: resolvedEmail, error } = await supabase.rpc(
      'get_email_by_username',
      { p_username: usernameOrEmail.trim() },
    );
    if (error || !resolvedEmail) {
      throw new Error('Usuario no encontrado.');
    }
    email = resolvedEmail;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL('reset-password'),
  });

  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      throw new Error('Enviamos demasiados emails recientemente. Esperá unos minutos e intentá de nuevo.');
    }
    throw new Error(error.message);
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
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

export async function updateProfile(
  residenteId: string,
  updates: {
    nombre?: string;
    apellido?: string;
    foto_url?: string | null;
    nivel_dificultad?: NivelDificultad;
    piso?: string;
    habitacion?: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from('residentes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', residenteId);

  if (error) throw new Error(error.message);
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

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', {
    p_username: username.trim(),
  });
  if (error) return false;
  return data === true;
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

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

async function uploadProfilePhoto(userId: string, uri: string): Promise<string> {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  let blob: Blob;

  // En web, expo-image-picker devuelve blob: o data: — fetch() las maneja bien
  // En nativo, usamos XMLHttpRequest para content:// y file:// URIs
  if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
    const response = await fetch(uri);
    blob = await response.blob();
  } else {
    blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error('No se pudo leer la imagen'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }

  const { error } = await supabase.storage
    .from('fotos-perfil')
    .upload(path, blob, { contentType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('fotos-perfil').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadAndGetPhotoUrl(
  userId: string,
  uri: string,
): Promise<string> {
  return uploadProfilePhoto(userId, uri);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFechaNacimiento(fecha: string): string | null {
  if (!fecha) return null;
  const parts = fecha.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// ─── Custom city persistence ──────────────────────────────────────────────────

/**
 * Inserta ciudades buscadas via Open-Meteo que no están en la tabla ciudades_familiares.
 * Estrategia:
 *  1. Upsert en ciudades_familiares (por nombre+pais_codigo) para obtener el id
 *  2. Insert en residente_ciudades_familiares (junction) con ignore_duplicates
 *
 * Se usa `activo = false` para marcar estas ciudades como "custom" y no
 * mezclarlas con las predeterminadas del selector de registro.
 */
export async function guardarCiudadesCustom(
  residenteId: string,
  ciudades: CiudadCustom[],
): Promise<void> {
  for (const ciudad of ciudades) {
    try {
      // 1. Upsert en ciudades_familiares para obtener ID (o reusar si ya existe)
      const { data: upserted, error: upsertError } = await supabase
        .from('ciudades_familiares')
        .upsert(
          {
            nombre: ciudad.nombre,
            pais_codigo: ciudad.pais_codigo,
            lat: ciudad.lat,
            lon: ciudad.lon,
            timezone: ciudad.timezone,
            activo: false,   // No aparece en el selector predeterminado
            orden: 999,      // Al final si algún día se activa
          },
          { onConflict: 'nombre,pais_codigo', ignoreDuplicates: false },
        )
        .select('id')
        .single();

      if (upsertError || !upserted?.id) continue;

      // 2. Insert en residente_ciudades_familiares (ignorar si ya existe)
      await supabase
        .from('residente_ciudades_familiares')
        .upsert(
          { residente_id: residenteId, ciudad_id: upserted.id },
          { onConflict: 'residente_id,ciudad_id', ignoreDuplicates: true },
        );
    } catch {
      // Fallo silencioso por ciudad individual — continuar con las demás
    }
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export const Validators = {
  nombre: (v: string) =>
    !v.trim() ? 'El nombre es obligatorio' :
    v.trim().length < 2 ? 'Mínimo 2 caracteres' : null,

  apellido: (v: string) =>
    !v.trim() ? 'El apellido es obligatorio' :
    v.trim().length < 2 ? 'Mínimo 2 caracteres' : null,

  fechaNacimiento: (v: string) => {
    if (!v.trim()) return 'La fecha de nacimiento es obligatoria';
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = v.match(regex);
    if (!match) return 'Formato: DD/MM/AAAA (ej: 15/06/1945)';
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month < 1 || month > 12) return 'El mes debe ser entre 01 y 12';
    if (day < 1 || day > 31) return 'El día debe ser entre 01 y 31';
    // Verificar que la fecha exista realmente (ej: 30/02 no existe)
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return `El día ${day} no existe en ese mes`;
    }
    if (date > new Date()) return 'La fecha no puede ser en el futuro';
    if (year < 1900) return 'El año debe ser mayor a 1900';
    return null;
  },

  username: (v: string) =>
    !v.trim() ? 'El nombre de usuario es obligatorio' :
    v.trim().length < 3 ? 'Mínimo 3 caracteres' : null,

  email: (v: string) => {
    if (!v.trim()) return 'El email es obligatorio';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(v.trim()) ? null : 'Email inválido';
  },

  password: (v: string) => {
    if (!v) return 'La contraseña es obligatoria';
    if (v.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(v)) return 'Debe tener al menos 1 mayúscula';
    return null;
  },

  confirmarPassword: (v: string, original: string) =>
    v !== original ? 'Las contraseñas no coinciden' : null,
};
