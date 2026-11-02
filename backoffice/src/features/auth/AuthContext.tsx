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
import { apiClient, ApiError } from '@/lib/apiClient';
import type { AccionModulo, MisPermisos, ModuloId, PerfilUsuario, RolBackoffice } from '@/types/backoffice.types';

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

  // Perfil, rol y super admin los resuelve el backend (GET /api/admin/profile):
  // el backoffice no decide por su cuenta quién es administrador. Si el backend
  // responde 401/403, la cuenta no tiene acceso al backoffice (rol residente o
  // cuenta deshabilitada) y se marca como no autorizada.
  const cargarPerfil = React.useCallback(async (silencioso = false) => {
    try {
      const data = await apiClient.get<PerfilUsuario>('/api/admin/profile');
      setPerfil(data);
      setAutorizado(true);
      void apiClient.post<void>('/api/admin/profile/acceso').catch(() => {});
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setAutorizado(false);
        setPerfil(null);
      } else if (!silencioso) {
        setPerfil(null);
      }
      // Un error transitorio de red en una re-verificación no borra el perfil que ya tenía.
    }
  }, []);

  // Usuario cuyos permisos ya están cargados. Sirve para distinguir la primera
  // carga (login) de las re-verificaciones que dispara Supabase solo — al volver
  // a la pestaña refresca el token y emite SIGNED_IN / TOKEN_REFRESHED.
  const usuarioCargadoRef = React.useRef<string | null>(null);

  // Permisos por módulo: los resuelve el backend (tabla modulo_usuario). Si falla
  // la primera carga, el usuario se queda sin módulos — nunca se asume un permiso
  // por defecto. En modo `silencioso` (re-verificación del mismo usuario) no se
  // muestra "Verificando permisos…" ni se desmonta la pantalla actual, y un error
  // transitorio de red no borra los permisos que ya tenía.
  const cargarMisPermisos = React.useCallback(async (silencioso = false) => {
    if (!silencioso) setCargandoPermisos(true);
    try {
      setMisPermisos(await apiClient.get<MisPermisos>('/api/admin/accesos/me'));
    } catch {
      if (!silencioso) setMisPermisos(null);
    } finally {
      if (!silencioso) setCargandoPermisos(false);
    }
  }, []);

  React.useEffect(() => {
    // sesión inicial al montar
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await cargarPerfil();
        await cargarMisPermisos();
        usuarioCargadoRef.current = data.session.user.id;
      }
      setCargando(false);
    });

    // escuchamos cambios de sesión (login/logout/refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Una sesión null que NO es un logout explícito (ej. un TOKEN_REFRESHED
      // fallido por un hipo transitorio de red) se re-verifica contra el
      // storage local antes de limpiar el perfil — si la sesión real sigue
      // viva, no hay que cerrarla solo porque este evento puntual vino vacío.
      if (!newSession && event !== 'SIGNED_OUT') {
        const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (data.session) return;
      }
      setSession(newSession);
      if (newSession?.user) {
        const mismoUsuario = usuarioCargadoRef.current === newSession.user.id;
        usuarioCargadoRef.current = newSession.user.id;
        if (mismoUsuario) {
          // Re-verificación en segundo plano (cambio de pestaña, refresh del
          // token): la pantalla sigue visible mientras tanto.
          void cargarPerfil(true);
          void cargarMisPermisos(true);
        } else {
          await cargarPerfil();
          await cargarMisPermisos();
        }
      } else {
        usuarioCargadoRef.current = null;
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
    usuarioCargadoRef.current = null;
    setPerfil(null);
    setMisPermisos(null);
    setAutorizado(true);
  }, []);

  const actualizarPerfil = React.useCallback(async (data: { nombre_completo?: string; avatar_url?: string }) => {
    if (!session?.user.id) return;
    await apiClient.patch<void>('/api/admin/profile', data);
    setPerfil((prev) => (prev ? { ...prev, ...data } : null));
  }, [session]);

  const esSuperAdmin = perfil?.rol === 'super_admin' || (misPermisos?.isSuperAdmin ?? false);

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
