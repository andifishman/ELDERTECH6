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

interface AuthState {
  session: Session | null;
  perfil: PerfilUsuario | null;
  rol: RolBackoffice;
  cargando: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  actualizarPerfil: (data: { nombre_completo?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [perfil, setPerfil] = React.useState<PerfilUsuario | null>(null);
  const [cargando, setCargando] = React.useState(true);

  // obtenemos el perfil del admin (rol/organización) desde la DB
  const cargarPerfil = React.useCallback(async (userId: string, email?: string) => {
    const { data } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setPerfil(data as PerfilUsuario);
      // registramos último acceso (no bloqueante)
      void supabase.from('perfiles_usuario').update({ ultimo_acceso: new Date().toISOString() }).eq('id', userId);
    } else {
      // si no hay fila de perfil, asumimos admin básico para no bloquear el acceso
      setPerfil({
        id: userId,
        organizacion_id: null,
        residente_id: null,
        rol: 'admin',
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
