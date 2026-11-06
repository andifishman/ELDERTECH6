// Tema por institución: cada geriátrico elige su color principal desde el backoffice (Instituciones) y la app de sus
// residentes se pone con ese color. Los estilos de React Native se calculan UNA vez al cargar cada pantalla, así que el
// color se aplica ANTES de que arranque la app (ver index.js) leyéndolo de lo último que guardó el dispositivo; después
// de iniciar sesión se compara con lo que dice el servidor y, si cambió, se guarda y la app se recarga una vez.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { apiClient } from '../services/apiClient';

const CLAVE = 'eldertech:color-principal';
const VIOLETA_ELDERTECH = '#5F3E88';
const HEX = /^#[0-9A-Fa-f]{6}$/;

const esHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);

function mezclarConBlanco(hex: string, t: number): string {
  const canal = (i: number) => Math.round(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + 255 * t);
  return `#${[0, 1, 2].map((i) => canal(i).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Color con el que arrancó esta ejecución (null = el violeta ElderTech de siempre). */
let aplicado: string | null = null;

/** Escribe el color de marca en los tokens de `Colors` que lo usan. Hay que llamarla antes de cargar las pantallas. */
export function aplicarColor(hex: string | null | undefined): void {
  const color = esHex(hex) ? hex.toUpperCase() : null;
  const base = color ?? VIOLETA_ELDERTECH;
  const brand = Colors.brand as unknown as Record<string, string>;
  const hablemos = Colors.hablemos as unknown as Record<string, string>;
  const radio = Colors.radio as unknown as Record<string, string>;
  brand.primary = base;
  brand.primarySoft = color ? mezclarConBlanco(base, 0.55) : '#B9A5D6';
  hablemos.accent = base;
  hablemos.accentDark = base;
  radio.playButtonActive = base;
  radio.nowPlayingBg = base;
  aplicado = color;
}

/** Arranque: aplica lo último que se guardó. Nunca bloquea ni rompe el arranque si el almacenamiento falla o tarda. */
export async function cargarYAplicarColor(): Promise<void> {
  try {
    const guardado = await Promise.race([AsyncStorage.getItem(CLAVE), new Promise<null>((resolver) => setTimeout(() => resolver(null), 800))]);
    aplicarColor(guardado);
  } catch {
    aplicarColor(null);
  }
}

async function recargarApp(): Promise<void> {
  if (Platform.OS === 'web') {
    window.location.reload();
    return;
  }
  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
  } catch {
    // Expo Go / desarrollo: sin recarga automática. El color queda guardado y se aplica la próxima vez que se abra la app.
  }
}

/**
 * Después de iniciar sesión: pregunta al servidor el color de la institución. Si es distinto del que está aplicado, lo guarda
 * y recarga la app UNA vez para que todas las pantallas lo tomen. Si no se pudo guardar, no recarga (evita un bucle).
 */
export async function sincronizarColorInstitucion(): Promise<void> {
  const { colorPrincipal } = await apiClient.get<{ colorPrincipal: string | null }>('/api/me/branding');
  const nuevo = esHex(colorPrincipal) ? colorPrincipal.toUpperCase() : null;
  if (nuevo === aplicado) return;

  if (nuevo) await AsyncStorage.setItem(CLAVE, nuevo);
  else await AsyncStorage.removeItem(CLAVE);
  const guardado = await AsyncStorage.getItem(CLAVE);
  if ((guardado ?? null) !== nuevo) return;
  await recargarApp();
}
