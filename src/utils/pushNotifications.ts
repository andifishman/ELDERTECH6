// Utilidades de Push Notifications (Expo). El envío real vive en el backend
// (services/notifications/*) — acá solo se pide permiso, se obtiene el token
// del dispositivo y se maneja qué pasa cuando el residente toca una notificación.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { esConversacionHablemosActiva } from './hablemosActiveChat';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { pantallaDestino?: string; conversationId?: string } | undefined;
    // Si es un mensaje de Hablemos y esa conversación ya está abierta en pantalla,
    // no mostrar el push — el chat ya se actualiza solo por Realtime.
    const suprimir = data?.pantallaDestino === 'hablemos' && esConversacionHablemosActiva(data.conversationId);
    return {
      shouldShowAlert: !suprimir,
      shouldPlaySound: !suprimir,
      shouldSetBadge: false,
      shouldShowBanner: !suprimir,
      shouldShowList: !suprimir,
    };
  },
});

/** Mapeo de `pantalla_destino` (guardado en la notificación) a una ruta real de expo-router. */
export const PANTALLA_A_RUTA: Record<string, string> = {
  home: '/',
  horarios: '/horarios',
  tutoriales: '/mas', // no hay pantalla propia de tutoriales todavía en esta versión
  asistente: '/asistente',
  clima: '/mas/clima',
  radio: '/mas/radio',
  pedidos: '/mas/pedidos',
  hablemos: '/mas/hablemos',
};

export async function pedirPermisoYObtenerToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // los emuladores no reciben push reales

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B5E3B',
    });
  }

  const permisoActual = await Notifications.getPermissionsAsync();
  let estado = permisoActual.status;
  if (estado !== 'granted') {
    const pedido = await Notifications.requestPermissionsAsync();
    estado = pedido.status;
  }
  if (estado !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn('[push] no se pudo obtener el token', err);
    return null;
  }
}

export function plataformaActual(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function nombreDispositivo(): string {
  return [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'Desconocido';
}
