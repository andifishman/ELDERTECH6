import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

interface AvisoGuardadoPartidaProps {
  guardando: boolean;
  errorGuardado: boolean;
  onReintentar: () => void;
  mensajeError?: string;
}

/** Cartel de "Guardando…" / "No se pudo guardar" con botón de reintentar, común a los juegos con puntaje. */
export function AvisoGuardadoPartida({
  guardando,
  errorGuardado,
  onReintentar,
  mensajeError = 'No se pudo guardar tu puntaje. Revisá tu conexión.',
}: AvisoGuardadoPartidaProps) {
  if (guardando) {
    return (
      <View style={styles.caja} accessibilityLiveRegion="polite">
        <Text style={styles.texto}>Guardando tu puntaje...</Text>
      </View>
    );
  }
  if (!errorGuardado) return null;
  return (
    <View style={styles.caja} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={20} color={Colors.status.errorDark} />
      <Text style={styles.texto}>{mensajeError}</Text>
      <TouchableOpacity style={styles.boton} onPress={onReintentar} accessibilityRole="button" accessibilityLabel="Reintentar guardar el puntaje">
        <Ionicons name="refresh" size={18} color={Colors.status.errorDark} />
        <Text style={styles.botonTexto}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    width: '100%',
    backgroundColor: Colors.status.errorBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  texto: { fontSize: Typography.size.sm, color: Colors.status.errorDark, textAlign: 'center' },
  boton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.status.errorDark,
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  botonTexto: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.status.errorDark },
});
