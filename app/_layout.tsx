import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-gesture-handler');
}
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as NavigationBar from 'expo-navigation-bar';
import { QueryProvider } from '@/providers/QueryProvider';
import { RadioProvider } from '@/context/RadioContext';
import { FavoritosProvider } from '@/context/FavoritosContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AsistenteConfigProvider } from '@/context/AsistenteConfigContext';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/services/supabase';
import { NowPlayingBar } from '@/components/radio/NowPlayingBar';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Con typedRoutes, segments es una unión de tuplas — indexar [1] no tipa
    const [grupo, pantalla] = segments as string[];
    const inAuthGroup = grupo === '(auth)';
    const isVerifyEmail = pantalla === 'verify-email';
    const isResetPassword = pantalla === 'reset-password';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !isVerifyEmail && !isResetPassword) {
      router.replace('/');
    }
  }, [session, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.brand.greenDark }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return <>{children}</>;
}

function DeepLinkHandler() {
  const router = useRouter();

  async function handleUrl(url: string) {
    const parsed = Linking.parse(url);
    const qp = parsed.queryParams ?? {};
    const access_token = qp.access_token as string | undefined;
    const refresh_token = qp.refresh_token as string | undefined;
    const type = qp.type as string | undefined;

    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
      if (type === 'signup' || type === 'email') {
        router.replace('/(auth)/verify-email');
      } else if (type === 'recovery') {
        router.replace('/(auth)/reset-password');
      }
    }
  }

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/(auth)/reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}

function useHideNavigationBar() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setBehaviorAsync('inset-swipe').catch(() => {});
    } catch {}
  }, []);
}

export default function RootLayout() {
  useHideNavigationBar();
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <FavoritosProvider>
            <AsistenteConfigProvider>
              <RadioProvider>
                <NavigationGuard>
                  <DeepLinkHandler />
                  <StatusBar style="light" />
                  <View style={{ flex: 1 }}>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="index" />
                      <Stack.Screen name="profile" />
                      <Stack.Screen name="horarios/index" />
                      <Stack.Screen name="horarios/[id]" />
                      <Stack.Screen name="mas/index" />
                      <Stack.Screen name="mas/clima" />
                      <Stack.Screen name="asistente/index" />
                      <Stack.Screen name="asistente/chat" />
                      <Stack.Screen name="asistente/historial" />
                      <Stack.Screen name="asistente/ajustes" />
                    </Stack>
                    <NowPlayingBar />
                  </View>
                </NavigationGuard>
              </RadioProvider>
            </AsistenteConfigProvider>
          </FavoritosProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
