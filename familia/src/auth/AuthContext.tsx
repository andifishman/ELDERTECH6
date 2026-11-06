import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/apiClient';
import { getMe, type Me, type ResidenteVinculado } from '@/services/familia';

type EstadoAcceso = 'cargando' | 'sin-sesion' | 'ok' | 'sin-acceso' | 'error';

interface AuthState {
  estado: EstadoAcceso;
  me: Me | null;
  /** Residente que se está mirando (el familiar puede tener varios). */
  residente: ResidenteVinculado | null;
  elegirResidente: (id: string) => void;
  pedirCodigo: (email: string) => Promise<{ error: string | null }>;
  verificarCodigo: (email: string, codigo: string) => Promise<{ error: string | null }>;
  cerrarSesion: () => Promise<void>;
  reintentar: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const CLAVE_RESIDENTE = 'familia:residente';

function leerResidenteGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_RESIDENTE);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [estado, setEstado] = useState<EstadoAcceso>('cargando');
  const [residenteId, setResidenteId] = useState<string | null>(leerResidenteGuardado);
  const usuarioRef = useRef<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSesionLista(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSession(nueva);
      setSesionLista(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const cargarMe = useCallback(async () => {
    setEstado('cargando');
    try {
      setMe(await getMe());
      setEstado('ok');
    } catch (err) {
      setMe(null);
      // 401/403 = la cuenta no es de un familiar activo (o se le sacó el acceso): se muestra el aviso, no un error técnico.
      setEstado(err instanceof ApiError && (err.status === 401 || err.status === 403) ? 'sin-acceso' : 'error');
    }
  }, []);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!sesionLista) return;
    if (!userId) {
      usuarioRef.current = null;
      setMe(null);
      setEstado('sin-sesion');
      return;
    }
    // Un refresco de token no recarga todo: solo cuando cambia la persona.
    if (usuarioRef.current === userId) return;
    usuarioRef.current = userId;
    void cargarMe();
  }, [sesionLista, userId, cargarMe]);

  const residente = useMemo(() => me?.residentes.find((r) => r.id === residenteId) ?? me?.residentes[0] ?? null, [me, residenteId]);

  const elegirResidente = useCallback((id: string) => {
    setResidenteId(id);
    try {
      localStorage.setItem(CLAVE_RESIDENTE, id);
    } catch {
      /* sin almacenamiento (modo privado): se recuerda solo mientras la app está abierta */
    }
  }, []);

  const pedirCodigo = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    // Si el email no está dado de alta Supabase también devuelve error: se muestra igual que si hubiera salido bien
    // para no revelar qué emails existen. Solo el límite de envíos se informa.
    if (error && (error.status === 429 || /rate limit|too many|seconds/i.test(error.message))) {
      return { error: 'Pediste muchos códigos seguidos. Esperá unos minutos y probá de nuevo.' };
    }
    return { error: null };
  }, []);

  const verificarCodigo = useCallback(async (email: string, codigo: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'email' });
    return { error: error ? 'El código no es correcto o ya venció. Revisalo o pedí uno nuevo.' : null };
  }, []);

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    qc.clear();
    setMe(null);
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({ estado, me, residente, elegirResidente, pedirCodigo, verificarCodigo, cerrarSesion, reintentar: () => void cargarMe() }),
    [estado, me, residente, elegirResidente, pedirCodigo, verificarCodigo, cerrarSesion, cargarMe],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
