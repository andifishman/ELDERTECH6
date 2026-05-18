import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useRadioPlayer } from '@/context/RadioContext';
import type { RadioStation } from '@/types/radio.types';

interface RadioCardProps {
  radio: RadioStation;
}

export function RadioCard({ radio }: RadioCardProps) {
  const { alternar, radioActual, estado } = useRadioPlayer();
  const esActiva = radioActual?.id === radio.id;
  const cargando = esActiva && estado === 'loading';
  const reproduciendo = esActiva && estado === 'playing';

  return (
    <View style={styles.card}>
      {/* Emoji de categoría */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>{radio.categoriaEmoji ?? '📻'}</Text>
      </View>

      {/* Solo el nombre — sin descripción ni género */}
      <Text style={styles.nombre} numberOfLines={2}>
        {radio.nombre}
      </Text>

      {/* Botón play/stop — grande y fácil de tocar */}
      <TouchableOpacity
        style={[styles.playButton, reproduciendo && styles.playButtonActivo]}
        onPress={() => alternar(radio)}
        accessibilityLabel={reproduciendo ? `Detener ${radio.nombre}` : `Reproducir ${radio.nombre}`}
        accessibilityRole="button"
      >
        {cargando ? (
          <ActivityIndicator size="large" color={Colors.text.onDark} />
        ) : (
          <Ionicons
            name={reproduciendo ? 'stop' : 'play'}
            size={32}
            color={Colors.text.onDark}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tarjeta más alta para facilitar el toque
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    marginHorizontal: Spacing.screen.horizontal,
    marginBottom: Spacing.md,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  // Círculo con emoji — más grande
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoEmoji: {
    fontSize: 32,
  },

  // Nombre de la radio — grande y legible
  nombre: {
    flex: 1,
    fontSize: 24,
    fontWeight: Typography.weight.regular,
    color: Colors.text.primary,
    lineHeight: 32,
  },

  // Botón play — grande (72×72) para no errarle
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.radio.playButton,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    flexShrink: 0,
  },
  playButtonActivo: {
    backgroundColor: Colors.radio.playButtonActive,
  },
});
