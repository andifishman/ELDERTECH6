// ========================================
// CONTEXTO: AuthContext
// DESCRIPCIÓN:
// Maneja la sesión de Supabase Auth del administrador,
// carga su perfil (rol y organización) y expone helpers
// de login/logout. Es la fuente de verdad de la identidad
// y los permisos del backoffice.
// ========================================
import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { PerfilUsuario, RolBackoffice } from '@/types/backoffice.types';

// Cuentas con acceso total al backoffice y gestión de administradores
const SUPER_ADMIN_EMAILS = ['andresfishman@gmail.com', 'eldertech6@gmail.com'];

function mapearRol(rawRol: string | null, email: string | null): RolBackoffice {
  if (email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) return 'super_admin';
  if (rawRol === 'admin') return 'admin';
  if (rawRol === 'staff') return 'editor';
  return 'editor';
}

function esAutorizado(rawRol: string | null, email: string | null): boolean {
  if (email && SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) return true;
  // solo admin y staff tienen acceso al backoffice; 'residente' no
  return rawRol === 'admin' || rawRol === 'staff';
}

interface AuthState {
  session: Session | null;
  perfil: PerfilUsuario | null;
  rol: RolBackoffice;
  autorizado: boolean;
  cargando: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  actualizarPerfil: (data: { nombre_completo?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [perfil, setPerfil] = React.useState<PerfilUsuario | null>(null);
  const [autorizado, setAutorizado] = React.useState(true);
  const [cargando, setCargando] = React.useState(true);

  // obtenemos el perfil del admin (rol/organización) desde la DB
  const cargarPerfil = React.useCallback(async (userId: string, email?: string) => {
    const { data } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const emailNorm = email?.toLowerCase() ?? null;

    if (data) {
      const rawRol = (data as Record<string, unknown>).rol as string | null;
      const rolMapeado = mapearRol(rawRol, emailNorm);
      setAutorizado(esAutorizado(rawRol, emailNorm));
      setPerfil({ ...data, rol: rolMapeado } as PerfilUsuario);
      void supabase.from('perfiles_usuario').update({ ultimo_acceso: new Date().toISOString() }).eq('id', userId);
    } else {
      // sin fila de perfil: solo acceso si el email es super_admin
      const isSuperAdmin = !!emailNorm && SUPER_ADMIN_EMAILS.includes(emailNorm);
      setAutorizado(isSuperAdmin);
      setPerfil({
        id: userId,
        organizacion_id: null,
        residente_id: null,
        rol: isSuperAdmin ? 'super_admin' : 'editor',
        nombre_completo: email ?? 'Administrador',
        avatar_url: null,
        email: email ?? null,
        activo: true,
        ultimo_acceso: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  }, []);

  React.useEffect(() => {
    // sesión inicial al montar
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await cargarPerfil(data.session.user.id, data.session.user.email);
      }
      setCargando(false);
    });

    // escuchamos cambios de sesión (login/logout/refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await cargarPerfil(newSession.user.id, newSession.user.email);
      } else {
        setPerfil(null);
        setAutorizado(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [cargarPerfil]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setAutorizado(true);
  }, []);

  const actualizarPerfil = React.useCallback(async (data: { nombre_completo?: string; avatar_url?: string }) => {
    if (!session?.user.id) return;
    await supabase.from('perfiles_usuario').update(data).eq('id', session.user.id);
    setPerfil((prev) => (prev ? { ...prev, ...data } : null));
  }, [session]);

  const value: AuthState = {
    session,
    perfil,
    rol: perfil?.rol ?? 'editor',
    autorizado,
    cargando,
    signIn,
    signOut,
    actualizarPerfil,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// hook de acceso a la sesión — falla si se usa fuera del provider
export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
