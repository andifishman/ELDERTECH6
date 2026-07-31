import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
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

    async function init() {
      // Timeout de seguridad — si algo falla, nunca quedarse en loading para siempre
      const safetyTimer = setTimeout(() => {
        if (mounted) setIsLoading(false);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;

        // Token inválido disparado por Supabase — limpiar y dejar que NavigationGuard redirija al login
        if (event === 'TOKEN_REFRESHED' && !s) {
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
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
