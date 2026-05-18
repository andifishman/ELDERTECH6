/**
 * ActividadCard.tsx
 * ─────────────────
 * Tarjeta que representa una actividad individual en la lista de horarios.
 *
 * Muestra:
 *  - Badge con la hora de inicio (grande y legible)
 *  - Emoji representativo de la actividad
 *  - Nombre de la actividad
 *  - Botón de voz para escuchar la descripción completa
 *
 * El color del badge cambia según el turno:
 *  - Azul índigo → actividades de mañana (antes de las 12hs)
 *  - Ámbar/naranja → actividades de tarde (desde las 12hs)
 *
 * Diseño pensado para personas mayores:
 *  - Hora en 22px sin negrita — grande y clara
 *  - Área táctil generosa (toda la tarjeta es presionable)
 *  - Contraste alto entre texto y fondo
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { SpeakButton } from '@/components/common/SpeakButton';
import { formatHora, esMañana } from '@/utils/dateUtils';
import type { ActividadCompleta } from '@/types/database.types';

interface ActividadCardProps {
  /** Datos completos de la actividad (con joins a tipo, ubicación y responsable) */
  actividad: ActividadCompleta;
  /** Callback al tocar la tarjeta — navega al detalle de la actividad */
  onPress: () => void;
}

export function ActividadCard({ actividad, onPress }: ActividadCardProps) {
  // Determinar si la actividad es de mañana o tarde para elegir el color
  const esTurnoMañana = esMañana(actividad.hora_inicio);
  const colorBadge = esTurnoMañana ? Colors.activity.morning : Colors.activity.afternoon;

  // Emoji: primero el de la actividad específica, luego el del tipo, fallback genérico
  const emoji = actividad.emoji_icono ?? actividad.tipo_actividad?.emoji ?? '📋';

  // Formatear la hora de inicio y fin para mostrar y para el texto de voz
  const horaTexto = formatHora(actividad.hora_inicio);
  const horaFin = actividad.hora_fin ? ` - ${formatHora(actividad.hora_fin)}` : '';

  // Texto completo para el botón de voz (TTS) — describe toda la actividad
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
      {/* ── Badge de hora ── */}
      {/* Color azul para mañana, naranja para tarde */}
      <View style={[styles.timeBadge, { backgroundColor: colorBadge }]}>
        <Text style={styles.timeText}>{horaTexto}</Text>
      </View>

      {/* ── Emoji de la actividad ── */}
      {/* Fondo semitransparente del mismo color que el badge */}
      <View style={[styles.iconCircle, { backgroundColor: `${colorBadge}22` }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* ── Nombre de la actividad ── */}
      <Text style={styles.nombre} numberOfLines={2}>
        {actividad.nombre}
      </Text>

      {/* ── Botón de voz: escuchar descripción completa ── */}
      <SpeakButton texto={textoHablar} size="md" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Tarjeta completa — fila horizontal con sombra suave
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

  // Badge de hora — rectángulo redondeado con el color del turno
  timeBadge: {
    width: 82,
    height: 52,
    borderRadius: Spacing.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // No se achica si el nombre es largo
  },

  // Texto de la hora — grande y sin negrita para no cansar la vista
  timeText: {
    fontSize: 22,
    fontWeight: '500' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Círculo con el emoji de la actividad
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Emoji dentro del círculo
  emoji: {
    fontSize: 24,
  },

  // Nombre de la actividad — ocupa el espacio restante
  nombre: {
    flex: 1,
    ...Typography.styles.activityName,
  },
});
