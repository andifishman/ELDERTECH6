//componentes de estado: spinner mientras carga y mensaje de error cuando falla
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

interface LoadingStateProps {
  mensaje?: string;
  color?: string;
}

export function LoadingState({ mensaje = 'Cargando...', color = Colors.brand.greenDark }: LoadingStateProps) {
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
  errorTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
});
