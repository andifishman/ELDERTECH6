import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { SpeakButton } from '@/components/common/SpeakButton';
import { formatHora, esMañana } from '@/utils/dateUtils';
import type { ActividadCompleta } from '@/types/database.types';

interface ActividadCardProps {
  actividad: ActividadCompleta;
  onPress: () => void;
}

export function ActividadCard({ actividad, onPress }: ActividadCardProps) {
  const mañana = esMañana(actividad.hora_inicio);
  const colorFondo = mañana ? Colors.activity.morning : Colors.activity.afternoon;
  const emoji = actividad.emoji_icono ?? actividad.tipo_actividad?.emoji ?? '📋';
  const horaTexto = formatHora(actividad.hora_inicio);
  const horaFin = actividad.hora_fin ? ` - ${formatHora(actividad.hora_fin)}` : '';

  const textoHablar = [
    `${actividad.nombre}.`,
    `Hora: ${horaTexto}${horaFin} horas.`,
    actividad.ubicacion ? `Lugar: ${actividad.ubicacion.nombre}.` : '',
    actividad.descripcion ?? '',
  ].filter(Boolean).join(' ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={textoHablar}
      accessibilityRole="button"
    >
      {/* Badge de hora */}
      <View style={[styles.timeBadge, { backgroundColor: colorFondo }]}>
        <Text style={styles.timeText}>{horaTexto}</Text>
      </View>

      {/* Emoji */}
      <View style={[styles.iconCircle, { backgroundColor: `${colorFondo}22` }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Nombre */}
      <Text style={styles.nombre} numberOfLines={2}>
        {actividad.nombre}
      </Text>

      {/* Botón hablar */}
      <SpeakButton texto={textoHablar} size="md" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    marginHorizontal: Spacing.screen.horizontal,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  timeBadge: {
    width: 66,
    height: 44,
    borderRadius: Spacing.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timeText: {
    ...Typography.styles.activityTime,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 24,
  },
  nombre: {
    flex: 1,
    ...Typography.styles.activityName,
  },
});
