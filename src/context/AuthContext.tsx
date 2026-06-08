import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { getProfile, getProfileForUser } from '@/services/authService';
import type { AuthProfile } from '@/types/auth.types';

const cacheKey = (uid: string) => `@et_profile_v1_${uid}`;

async function readCache(uid: string): Promise<AuthProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(uid));
    return raw ? (JSON.parse(raw) as AuthProfile) : null;
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
  updateLocalProfile: (updates: Partial<AuthProfile['residente']>) => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
  updateLocalProfile: () => {},
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

  // Actualiza campos del residente localmente sin ir a Supabase
  const updateLocalProfile = useCallback((updates: Partial<AuthProfile['residente']>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated: AuthProfile = {
        ...prev,
        residente: prev.residente ? { ...prev.residente, ...updates } : prev.residente,
      };
      const uid = currentUidRef.current;
      if (uid) writeCache(uid, updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Timeout de seguridad — si algo falla, nunca quedarse en loading para siempre
      const safetyTimer = setTimeout(() => {
        if (mounted) setIsLoading(false);
      }, 8000);

      try {
        // Step 1: get session from local storage (fast, no network)
        let s: Session | null = null;
        try {
          const { data } = await supabase.auth.getSession();
          s = data.session;
        } catch {}

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
            // Step 3: background refresh usando userId ya conocido — sin roundtrip extra
            getProfileForUser(uid)
              .then(fresh => {
                if (!mounted || !fresh) return;
                setProfile(fresh);
                writeCache(uid, fresh);
              })
              .catch(() => {});
          } else {
            // First login ever — fetch con getProfileForUser para evitar getUser() extra
            try {
              const p = await getProfileForUser(uid);
              if (mounted) {
                setProfile(p);
                if (p) writeCache(uid, p);
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

        // INITIAL_SESSION is handled by init() above — skip to avoid double fetch
        if (event === 'INITIAL_SESSION') return;

        setSession(s);

        if (event === 'SIGNED_OUT') {
          const uid = currentUidRef.current;
          if (uid) clearCache(uid);
          currentUidRef.current = null;
          setProfile(null);
          setIsLoading(false);
          return;
        }

        if (s?.user.id) {
          currentUidRef.current = s.user.id;
          try {
            const p = await getProfileForUser(s.user.id);
            if (mounted) {
              setProfile(p);
              if (p) writeCache(s.user.id, p);
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
    <AuthContext.Provider value={{ session, profile, isLoading, refreshProfile, updateLocalProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
