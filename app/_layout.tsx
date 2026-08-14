import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-gesture-handler');
}
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { QueryProvider } from '@/providers/QueryProvider';
import { RadioProvider } from '@/context/RadioContext';
import { FavoritosProvider } from '@/context/FavoritosContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AsistenteConfigProvider } from '@/context/AsistenteConfigContext';
import { SonidoJuegosProvider } from '@/context/SonidoJuegosContext';
import { ActivityIndicator, View, Text } from 'react-native';
import { Colors } from '@/constants/Colors';
import { apiUrlMisconfigurada, API_URL } from '@/utils/apiUrlGuard';

// CONFIRMADO: `Text.defaultProps`/`TextInput.defaultProps` (lo que había acá
// antes) nunca tuvo efecto — React 19 ignora `defaultProps` en componentes
// de función, y `Text`/`TextInput` de React Native son componentes de
// función (`component(...)`). Por eso el corte del último carácter/palabra
// en Android (bug conocido del algoritmo de salto de línea "highQuality" con
// texto en negrita — https://github.com/facebook/react-native/issues/21729)
// y el desborde de "Texto grande" del sistema en elementos de tamaño fijo
// seguían pasando pase lo que pase acá.
// Arreglo real: patches/react-native+0.81.5.patch (via patch-package,
// corre en el `postinstall` del root package.json — EAS Build/Update lo
// levanta solo). Ese patch mete `maxFontSizeMultiplier` y
// `textBreakStrategy="simple"` como default de verdad, en la desestructuración
// de props de Text.js/TextInput.js, para toda la app sin tocar cada pantalla.
// Si se actualiza la versión de react-native, hay que regenerar el patch
// (`npx patch-package react-native`) — probablemente cambien los números de
// línea o la estructura interna del archivo.
import { NowPlayingBar } from '@/components/radio/NowPlayingBar';
import { AGENDA_ACCION_MARCAR_REALIZADO, PANTALLA_A_RUTA, registrarCategoriasNotificacion } from '@/utils/pushNotifications';
import { marcarNotificacionAbierta } from '@/services/notificationsService';
import { detenerHabla } from '@/utils/tts';
import { cambiarEstadoRecordatorio } from '@/services/agendaService';

/** Corta cualquier lectura en voz alta (botón "Escuchar") al cambiar de pantalla —
 * si no, el audio de una sección sigue sonando aunque el usuario ya se haya ido. */
function useStopSpeechOnNavigate() {
  const pathname = usePathname();
  useEffect(() => {
    void detenerHabla();
  }, [pathname]);
}

/** Al tocar una notificación (app en background/cerrada), navega a la pantalla indicada y la marca como abierta. */
function useNotificationTapHandler() {
  const router = useRouter();

  useEffect(() => {
    void registrarCategoriasNotificacion();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { notificationId?: string; pantallaDestino?: string; conversationId?: string; recordatorioId?: string }
        | undefined;
      if (data?.notificationId) void marcarNotificacionAbierta(data.notificationId).catch(() => {});

      // Botón "✓ Realizado" tocado directo desde la notificación de Agenda —
      // no navega, solo marca el recordatorio (best-effort, no bloquea nada si falla).
      if (response.actionIdentifier === AGENDA_ACCION_MARCAR_REALIZADO && data?.recordatorioId) {
        void cambiarEstadoRecordatorio(data.recordatorioId, 'realizado').catch(() => {});
        return;
      }

      if (data?.pantallaDestino === 'hablemos' && data.conversationId) {
        router.push(`/mas/hablemos/${data.conversationId}` as never);
        return;
      }
      if (data?.pantallaDestino === 'agenda' && data.recordatorioId) {
        router.push(`/agenda/${data.recordatorioId}` as never);
        return;
      }
      const ruta = data?.pantallaDestino ? PANTALLA_A_RUTA[data.pantallaDestino] : undefined;
      if (ruta) router.push(ruta as never);
    });
    return () => sub.remove();
  }, [router]);
}

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

/** Pantalla de error a pantalla completa cuando EXPO_PUBLIC_API_URL apunta a
 * "localhost" (o está vacía) en un build real. Reemplaza el silencio de
 * "sin datos aún" por un mensaje imposible de ignorar — ver apiUrlGuard.ts. */
function ConfigErrorScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#B3261E', padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' }}>
        La app no está configurada correctamente
      </Text>
      <Text style={{ fontSize: 17, color: '#FFFFFF', textAlign: 'center', lineHeight: 24 }}>
        No se encontró la dirección del servidor (EXPO_PUBLIC_API_URL="{API_URL || '(vacía)'}"). Avisá al
        equipo técnico: hay que configurar la variable de entorno del backend en EAS antes de publicar este build.
      </Text>
    </View>
  );
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
  useNotificationTapHandler();
  useStopSpeechOnNavigate();

  if (apiUrlMisconfigurada) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ConfigErrorScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <FavoritosProvider>
            <AsistenteConfigProvider>
              <SonidoJuegosProvider>
              <RadioProvider>
                <NavigationGuard>
                  <StatusBar style="light" />
                  <View style={{ flex: 1 }}>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="index" />
                      <Stack.Screen name="como-usar/index" />
                      <Stack.Screen name="como-usar/[id]" />
                      <Stack.Screen name="horarios/index" />
                      <Stack.Screen name="horarios/[id]" />
                      <Stack.Screen name="agenda/index" />
                      <Stack.Screen name="agenda/nuevo" />
                      <Stack.Screen name="agenda/[id]" />
                      <Stack.Screen name="mas/index" />
                      <Stack.Screen name="mas/clima" />
                      <Stack.Screen name="mas/hablemos/index" />
                      <Stack.Screen name="mas/hablemos/buscar" />
                      <Stack.Screen name="mas/hablemos/[conversacionId]" />
                      <Stack.Screen name="asistente/index" />
                      <Stack.Screen name="asistente/chat" />
                      <Stack.Screen name="asistente/historial" />
                      <Stack.Screen name="asistente/ajustes" />
                    </Stack>
                    <NowPlayingBar />
                  </View>
                </NavigationGuard>
              </RadioProvider>
              </SonidoJuegosProvider>
            </AsistenteConfigProvider>
          </FavoritosProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
