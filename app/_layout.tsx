import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { RadioProvider } from '@/context/RadioContext';
import { FavoritosProvider } from '@/context/FavoritosContext';
<<<<<<< Updated upstream
=======
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

    const inAuthGroup = segments[0] === '(auth)';
    const isVerifyEmail = segments[1] === 'verify-email';
    const isResetPassword = segments[1] === 'reset-password';

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
    // App opened from a deep link while killed
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // App in background, deep link received
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // En web, Supabase detecta el token del hash de la URL automáticamente
  // y dispara PASSWORD_RECOVERY antes de que el URL handler lo capture
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
>>>>>>> Stashed changes

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
<<<<<<< Updated upstream
        <FavoritosProvider>
        <RadioProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="horarios/index" />
            <Stack.Screen name="horarios/[id]" />
            <Stack.Screen name="mas/index" />
            <Stack.Screen name="mas/clima" />
          </Stack>
        </RadioProvider>
        </FavoritosProvider>
=======
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
                  {/* Barra de radio persistente — visible en todas las pantallas cuando hay audio activo */}
                  <NowPlayingBar />
                </View>
              </NavigationGuard>
            </RadioProvider>
            </AsistenteConfigProvider>
          </FavoritosProvider>
        </AuthProvider>
>>>>>>> Stashed changes
      </QueryProvider>
    </SafeAreaProvider>
  );
}
