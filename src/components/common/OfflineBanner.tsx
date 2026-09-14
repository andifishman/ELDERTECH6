// Aviso de "sin conexión a internet" — global, visible en cualquier pantalla.
//
// Decisiones de diseño (investigadas para usuarios mayores):
// - Ícono + texto SIEMPRE juntos, nunca solo el ícono — no todos reconocen el
//   símbolo de "nube tachada" por sí solo.
// - Naranja en vez de rojo: es un estado recuperable y esperable (se
//   soluciona solo apenas vuelve la señal), no una falla grave — el rojo se
//   reserva para errores reales en el resto de la app.
// - Lenguaje directo, sin jerga técnica ("sin conexión", no "error de red" o
//   códigos de estado).
// - Aparece y desaparece solo (no hay que tocar nada) apenas cambia el estado
//   de la conexión — ver useNetworkStatus.
//
// A propósito NO es un overlay flotante (position: absolute) — la primera
// versión sí lo era y tapaba el botón de volver de cada pantalla (cada
// AppHeader arma su propio espacio para el status bar con insets.top, así
// que un banner superpuesto quedaba justo encima). Ahora es un bloque más
// en el flujo normal, renderizado ANTES del Stack en _layout.tsx: cuando
// aparece empuja el contenido hacia abajo en vez de taparlo, así el header
// de la pantalla (con su botón de volver) siempre queda completo y tocable.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export function OfflineBanner() {
  const { conectado } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (conectado) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + Spacing.sm }]}>
      <Ionicons name="cloud-offline" size={22} color={Colors.text.onDark} />
      <Text style={styles.texto}>
        Sin conexión a internet. Algunas funciones no van a estar disponibles hasta que se recupere la conexión.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.orange,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  texto: {
    flex: 1,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.onDark,
    lineHeight: 20,
  },
});
