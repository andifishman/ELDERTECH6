import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-gesture-handler');
}
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { QueryProvider } from '@/providers/QueryProvider';
import { RadioProvider } from '@/context/RadioContext';
import { FavoritosProvider } from '@/context/FavoritosContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AsistenteConfigProvider } from '@/context/AsistenteConfigContext';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { NowPlayingBar } from '@/components/radio/NowPlayingBar';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Con typedRoutes, segments es una unión de tuplas — indexar [0] no tipa
    const [grupo] = segments as string[];
    const inAuthGroup = grupo === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
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
                  <StatusBar style="light" />
                  <View style={{ flex: 1 }}>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="index" />
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
