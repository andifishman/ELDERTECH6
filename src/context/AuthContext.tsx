import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, AUTH_STORAGE_KEY } from '@/services/supabase';
import { getProfileForUser } from '@/services/authService';
import { registrarPushToken } from '@/services/notificationsService';
import { pedirPermisoYObtenerToken, plataformaActual, nombreDispositivo } from '@/utils/pushNotifications';
import type { AuthProfile } from '@/types/auth.types';

async function registrarConexion(residenteId: string): Promise<void> {
  try {
    await supabase
      .from('residentes')
      .update({ ultima_conexion: new Date().toISOString() })
      .eq('id', residenteId);
  } catch {}
}

/** Best-effort — si falla (sin permiso, emulador, red), no bloquea el login. */
async function registrarDispositivoParaPush(): Promise<void> {
  try {
    const token = await pedirPermisoYObtenerToken();
    if (!token) return;
    await registrarPushToken(token, plataformaActual(), nombreDispositivo());
  } catch (err) {
    console.warn('[push] no se pudo registrar el dispositivo', err);
  }
}

const cacheKey = (uid: string) => `@et_profile_v1_${uid}`;

async function readCache(uid: string): Promise<AuthProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthProfile;
    // Validación mínima del shape: si cambia AuthProfile, subir la versión
    // de cacheKey (_v1_ → _v2_) para invalidar cachés viejos automáticamente
    if (!parsed?.perfil?.id) return null;
    return parsed;
  } catch { return null; }
}

async function writeCache(uid: string, p: AuthProfile): Promise<void> {
  try { await AsyncStorage.setItem(cacheKey(uid), JSON.stringify(p)); } catch {}
}

async function clearCache(uid: string): Promise<void> {
  try { await AsyncStorage.removeItem(cacheKey(uid)); } catch {}
}

/** Sesión tal como la guardó Supabase en el dispositivo, leída directo (sin red ni candados). */
async function leerSesionGuardada(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s?.user?.id && s.refresh_token ? s : null;
  } catch { return null; }
}

interface AuthContextValue {
  session: Session | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUidRef = useRef<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const uid = currentUidRef.current;
    if (!uid) return;
    try {
      const p = await getProfileForUser(uid);
      if (p) {
        setProfile(p);
        writeCache(uid, p);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    let sesionResuelta = false;

    async function init() {
      // Timeout de seguridad — si algo falla, nunca quedarse en loading para siempre.
      // Pero NO mandar al login a alguien que sí tiene sesión guardada solo porque Supabase tardó
      // (red lenta al abrir, refresco del token): para un residente eso es "se me cerró la sesión"
      // y no sabe volver a entrar. Si hay sesión guardada se usa; Supabase la confirma después.
      const safetyTimer = setTimeout(() => {
        void (async () => {
          if (!mounted || sesionResuelta) return;
          const guardada = await leerSesionGuardada();
          if (!mounted || sesionResuelta) return;
          if (guardada) {
            setSession((actual) => actual ?? guardada);
            const cached = await readCache(guardada.user.id);
            if (!mounted || sesionResuelta) return;
            if (cached) setProfile((actual) => actual ?? cached);
          }
          setIsLoading(false);
        })();
      }, 5000);

      try {
        // Step 1: get session from local storage (fast, no network)
        let s: Session | null = null;
        try {
          const { data } = await supabase.auth.getSession();
          s = data.session;
        } catch (err) {
          // Refresh token inválido o expirado — limpiar sesión local para no quedar bloqueado
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('Refresh Token') || msg.includes('refresh_token')) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          }
          s = null;
        }

        if (!mounted) return;
        sesionResuelta = true;
        setSession(s);

        if (s?.user.id) {
          const uid = s.user.id;
          currentUidRef.current = uid;

          // Step 2: load cache immediately — show app with no spinner
          const cached = await readCache(uid);
          if (!mounted) return;

          if (cached) {
            setProfile(cached);
            setIsLoading(false); // App visible instantly
            if (cached.residente?.id) {
              void registrarConexion(cached.residente.id);
              void registrarDispositivoParaPush();
            }
            // Step 3: background refresh usando userId ya conocido — sin roundtrip extra
            getProfileForUser(uid)
              .then(fresh => {
                if (!mounted || !fresh) return;
                setProfile(fresh);
                writeCache(uid, fresh);
              })
              .catch(() => {});
          } else {
            // First login — fetch con timeout explícito: si Supabase tarda >4s no bloqueamos la UI
            try {
              const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
              const p = await Promise.race([getProfileForUser(uid), timeout]);
              if (mounted) {
                setProfile(p);
                if (p) {
                  writeCache(uid, p);
                  if (p.residente?.id) {
                    void registrarConexion(p.residente.id);
                    void registrarDispositivoParaPush();
                  }
                }
              }
            } catch {}
            if (mounted) setIsLoading(false);
          }
        } else {
          currentUidRef.current = null;
          setProfile(null);
          setIsLoading(false);
        }
      } finally {
        clearTimeout(safetyTimer);
      }
    }

    init();

    // Supabase ejecuta este callback CON su candado de sesión tomado y espera a que termine: si adentro
    // se consulta Supabase (getProfileForUser, signOut) se traba esperando ese mismo candado
    // (lo advierte su documentación). Por eso el trabajo se hace en un setTimeout, ya afuera.
    async function alCambiarSesion(event: AuthChangeEvent, s: Session | null): Promise<void> {
        if (!mounted) return;

        // TOKEN_REFRESHED con sesión null: puede ser un refresh token genuinamente
        // vencido/revocado, pero TAMBIÉN puede ser un hipo transitorio de red
        // durante el refresh automático — no son lo mismo. Antes se asumía siempre
        // lo primero y se cerraba sesión de inmediato, lo que un residente percibe
        // como "se me cerró la sesión sin razón". Se re-verifica contra el storage
        // local antes de decidir: si la sesión real sigue viva, no se toca nada.
        if (event === 'TOKEN_REFRESHED' && !s) {
          const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
          if (data.session) return; // hipo transitorio — la sesión sigue viva
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setSession(null);
          setProfile(null);
          currentUidRef.current = null;
          if (mounted) setIsLoading(false);
          return;
        }

        // INITIAL_SESSION is handled by init() above — skip to avoid double fetch
        if (event === 'INITIAL_SESSION') return;

        setSession(s);

        if (event === 'SIGNED_OUT') {
          // No borramos el cache en logout: el dispositivo es de un solo residente
          // y el cache es por uid. En el próximo login se restaura instantáneamente.
          // En web el navegador puede ser compartido: ahi si se borra el perfil guardado (nombre, habitacion).
          if (Platform.OS === 'web' && currentUidRef.current) void clearCache(currentUidRef.current);
          currentUidRef.current = null;
          setProfile(null);
          setIsLoading(false);
          return;
        }

        if (s?.user.id) {
          currentUidRef.current = s.user.id;

          // En SIGNED_IN: spinner inmediato para no mostrar el estado de error
          // mientras el perfil se fetchea. Intentamos cache primero para que
          // usuarios que ya loguearon antes vean datos instantáneos.
          if (event === 'SIGNED_IN' && mounted) {
            setIsLoading(true);
            const cached = await readCache(s.user.id);
            if (cached && mounted) {
              setProfile(cached);
              setIsLoading(false);
            }
          }

          try {
            // Timeout de 5s: igual que en init(). Sin esto, si Supabase tarda
            // o la red es lenta, isLoading queda en true para siempre.
            const fetchTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
            const p = await Promise.race([getProfileForUser(s.user.id), fetchTimeout]);
            if (mounted) {
              setProfile(p);
              if (p) {
                writeCache(s.user.id, p);
                if (event === 'SIGNED_IN' && p.residente?.id) {
                  void registrarConexion(p.residente.id);
                  void registrarDispositivoParaPush();
                }
              }
            }
          } catch {
            if (mounted) setProfile(null);
          }
        } else {
          currentUidRef.current = null;
          setProfile(null);
        }
        if (mounted) setIsLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setTimeout(() => void alCambiarSesion(event, s), 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Recomendación oficial de Supabase para React Native: sin esto, el timer
  // interno de autoRefreshToken se pausa cuando la app queda en segundo plano
  // (los timers de JS no corren de forma confiable ahí) y el token puede
  // vencerse en silencio mientras el residente tiene el celular bloqueado o
  // está en otra app — al volver, la sesión ya está vencida. No aplica en web
  // (el navegador no tiene este problema de timers en background).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
