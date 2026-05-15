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
      {/* Ícono de radio */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>{radio.categoriaEmoji ?? '📻'}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={1}>
          {radio.nombre}
        </Text>
        {radio.descripcion ? (
          <Text style={styles.descripcion} numberOfLines={1}>
            {radio.descripcion}
          </Text>
        ) : null}
        {radio.genero ? (
          <Text style={styles.genero} numberOfLines={1}>
            {radio.genero}
          </Text>
        ) : null}
      </View>

      {/* Botón play */}
      <TouchableOpacity
        style={[styles.playButton, reproduciendo && styles.playButtonActivo]}
        onPress={() => alternar(radio)}
        accessibilityLabel={reproduciendo ? `Detener ${radio.nombre}` : `Reproducir ${radio.nombre}`}
        accessibilityRole="button"
      >
        {cargando ? (
          <ActivityIndicator size="small" color={Colors.text.onDark} />
        ) : (
          <Ionicons
            name={reproduciendo ? 'stop' : 'play'}
            size={22}
            color={Colors.text.onDark}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    marginHorizontal: Spacing.screen.horizontal,
    marginBottom: Spacing.sm,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nombre: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  descripcion: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  genero: {
    fontSize: Typography.size.xs,
    color: Colors.text.hint,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.radio.playButton,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  playButtonActivo: {
    backgroundColor: Colors.radio.playButtonActive,
  },
});
