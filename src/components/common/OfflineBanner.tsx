// Aviso de "sin conexión a internet" — global, visible en cualquier pantalla.
//
// Decisiones de diseño (investigadas para usuarios mayores):
// - Ícono + texto SIEMPRE juntos, nunca solo el ícono — no todos reconocen el
//   símbolo de "nube tachada" por sí solo.
// - Naranja/ámbar en vez de rojo: es un estado recuperable y esperable (se
//   soluciona solo apenas vuelve la señal), no una falla grave — el rojo se
//   reserva para errores reales en el resto de la app.
// - Posición fija arriba de todo, siempre en el mismo lugar — no interrumpe
//   la pantalla actual ni tapa contenido con un modal que haya que cerrar.
// - Lenguaje directo, sin jerga técnica ("sin conexión", no "error de red" o
//   códigos de estado).
// - Aparece y desaparece solo (no hay que tocar nada) apenas cambia el estado
//   de la conexión — ver useNetworkStatus.
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
    <View style={[styles.wrapper, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="none">
      <View style={styles.banner}>
        <Ionicons name="cloud-offline" size={24} color={Colors.text.onDark} />
        <Text style={styles.texto}>
          Sin conexión a internet. Algunas funciones no van a estar disponibles hasta que se recupere la conexión.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: Spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.orange,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  texto: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.onDark,
    lineHeight: 22,
  },
});
