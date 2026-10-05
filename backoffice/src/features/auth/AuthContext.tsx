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
import { apiClient } from '@/lib/apiClient';
import type { AccionModulo, MisPermisos, ModuloId, PerfilUsuario, RolBackoffice } from '@/types/backoffice.types';

// Cuentas con acceso total al backoffice y gestión de administradores
const SUPER_ADMIN_EMAILS = ['eldertech6@gmail.com'];

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
  /** true mientras se cargan los permisos por módulo (después del login) */
  cargandoPermisos: boolean;
  /** Super Super Admin: acceso total, no depende de los permisos por módulo */
  esSuperAdmin: boolean;
  /** ¿Puede el usuario hacer `accion` dentro de `modulo`? La UI lo usa para mostrar u ocultar; el backend lo verifica igual. */
  puede: (modulo: ModuloId, accion?: AccionModulo) => boolean;
  /** Módulos que el usuario puede ver */
  modulosVisibles: string[];
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
  const [misPermisos, setMisPermisos] = React.useState<MisPermisos | null>(null);
  const [cargandoPermisos, setCargandoPermisos] = React.useState(false);

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
      // Cuenta deshabilitada: sin acceso (el servidor lo vuelve a verificar en cada request)
      if ((data as Record<string, unknown>).activo === false && rolMapeado !== 'super_admin') setAutorizado(false);
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

  // Permisos por módulo: los resuelve el backend (tabla modulo_usuario). Si falla,
  // el usuario se queda sin módulos — nunca se asume un permiso por defecto.
  const cargarMisPermisos = React.useCallback(async () => {
    setCargandoPermisos(true);
    try {
      setMisPermisos(await apiClient.get<MisPermisos>('/api/admin/accesos/me'));
    } catch {
      setMisPermisos(null);
    } finally {
      setCargandoPermisos(false);
    }
  }, []);

  React.useEffect(() => {
    // sesión inicial al montar
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await cargarPerfil(data.session.user.id, data.session.user.email);
        await cargarMisPermisos();
      }
      setCargando(false);
    });

    // escuchamos cambios de sesión (login/logout/refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await cargarPerfil(newSession.user.id, newSession.user.email);
        void cargarMisPermisos();
      } else {
        setPerfil(null);
        setMisPermisos(null);
        setAutorizado(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [cargarPerfil, cargarMisPermisos]);

  const signIn = React.useCallback(async (usernameOrEmail: string, password: string) => {
    const input = usernameOrEmail.trim();

    // Si parece un email, ir directo sin resolver username
    if (input.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({ email: input.toLowerCase(), password });
      return { error: error?.message ?? null };
    }

    // Es un username — resolver a email (mismo RPC que usa la app móvil)
    const { data: resolved, error: lookupError } = await supabase.rpc('get_email_by_username', { p_username: input });
    if (lookupError || !resolved) {
      return { error: 'Usuario no encontrado. Revisá el nombre de usuario.' };
    }

    const { error } = await supabase.auth.signInWithPassword({ email: resolved, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setMisPermisos(null);
    setAutorizado(true);
  }, []);

  const actualizarPerfil = React.useCallback(async (data: { nombre_completo?: string; avatar_url?: string }) => {
    if (!session?.user.id) return;
    await apiClient.patch<void>('/api/admin/profile', data);
    setPerfil((prev) => (prev ? { ...prev, ...data } : null));
  }, [session]);

  const esSuperAdmin = misPermisos?.isSuperAdmin ?? perfil?.rol === 'super_admin';

  const puede = React.useCallback(
    (modulo: ModuloId, accion: AccionModulo = 'ver') => {
      if (esSuperAdmin) return true;
      const p = misPermisos?.permisos.find((x) => x.moduloId === modulo);
      if (!p || !p.ver) return false; // sin "ver" no se puede nada más
      return accion === 'ver' ? true : p[accion];
    },
    [esSuperAdmin, misPermisos],
  );

  const modulosVisibles = React.useMemo(
    () => (misPermisos?.permisos ?? []).filter((p) => p.ver).map((p) => p.moduloId),
    [misPermisos],
  );

  const value: AuthState = {
    session,
    perfil,
    rol: perfil?.rol ?? 'editor',
    autorizado,
    cargando,
    cargandoPermisos,
    esSuperAdmin,
    puede,
    modulosVisibles,
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
