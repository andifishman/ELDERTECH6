//componentes de estado: spinner mientras carga y mensaje de error cuando falla
import React from 'react';
import { View, ActivityIndicator, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

interface LoadingStateProps {
  mensaje?: string;
  color?: string;
}

export function LoadingState({ mensaje = 'Cargando...', color = Colors.brand.primary }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      <Text style={styles.texto}>{mensaje}</Text>
    </View>
  );
}

interface ErrorStateProps {
  mensaje?: string;
  onReintentar?: () => void;
}

export function ErrorState({ mensaje = 'Error al cargar los datos.', onReintentar }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorEmoji}>⚠️</Text>
      <Text style={styles.errorTexto}>{mensaje}</Text>
      {onReintentar ? (
        <Pressable
          onPress={onReintentar}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          style={({ pressed }) => [styles.reintentar, pressed && styles.reintentarPresionado]}
        >
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  texto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  errorEmoji: {
    fontSize: 48,
  },
  reintentar: {
    minHeight: 56,
    minWidth: 180,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reintentarPresionado: { opacity: 0.85 },
  reintentarTexto: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  errorTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
});
