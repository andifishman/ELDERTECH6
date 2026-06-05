/**
 * ActividadCard.tsx
 * ─────────────────
 * Tarjeta de actividad rediseñada para adultos mayores (80-95 años).
 *
 * Layout:
 *   Fila superior: badge hora + emoji + nombre de la actividad
 *   Fila inferior: botón "Ver más" (primero) + botón "Escuchar"
 *
 * Los botones son grandes y con texto claro para facilitar el toque.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { hablar } from '@/utils/tts';
import { formatHora, esMañana } from '@/utils/dateUtils';
import type { ActividadCompleta } from '@/types/database.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = Math.min(1, SCREEN_WIDTH / 390);
function s(size: number, min?: number): number {
  const scaled = Math.round(size * scale);
  return min !== undefined ? Math.max(min, scaled) : scaled;
}

interface ActividadCardProps {
  actividad: ActividadCompleta;
  onPress: () => void;
}

export function ActividadCard({ actividad, onPress }: ActividadCardProps) {
  const esTurnoMañana = esMañana(actividad.hora_inicio);
  const colorBadge = esTurnoMañana ? Colors.activity.morning : Colors.activity.afternoon;
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
    <View style={styles.card}>

      {/* ── Fila superior: hora + emoji + nombre ── */}
      <View style={styles.filaTop}>
        <View style={[styles.timeBadge, { backgroundColor: colorBadge }]}>
          <Text style={styles.timeText}>{horaTexto}</Text>
        </View>

        <View style={[styles.iconCircle, { backgroundColor: `${colorBadge}22` }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>

        <Text style={styles.nombre} numberOfLines={2}>
          {actividad.nombre}
        </Text>
      </View>

      {/* ── Fila inferior: Ver más (primero) + Escuchar ── */}
      <View style={styles.filaBottom}>

        {/* Botón Ver más — color del turno, texto blanco */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colorBadge }]}
          onPress={onPress}
          activeOpacity={0.8}
          accessibilityLabel={`Ver descripción de ${actividad.nombre}`}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={22} color="#fff" />
          <Text style={[styles.btnTexto, { color: '#fff' }]}>Ver más</Text>
        </TouchableOpacity>

        {/* Botón Escuchar — fondo gris claro, color del turno */}
        <TouchableOpacity
          style={[styles.btn, styles.btnEscuchar]}
          onPress={() => hablar(textoHablar)}
          activeOpacity={0.8}
          accessibilityLabel={`Escuchar descripción de ${actividad.nombre}`}
          accessibilityRole="button"
        >
          <Ionicons name="volume-medium-outline" size={22} color={colorBadge} />
          <Text style={[styles.btnTexto, { color: colorBadge }]}>Escuchar</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    marginHorizontal: Spacing.screen.horizontal,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: s(Spacing.md, 10),
    gap: Spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  // Fila superior: hora + emoji + nombre
  filaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(Spacing.md, 8),
  },

  timeBadge: {
    width: s(82, 68),
    height: s(52, 44),
    borderRadius: Spacing.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timeText: {
    fontSize: s(22, 17),
    fontWeight: '500' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  iconCircle: {
    width: s(44, 36),
    height: s(44, 36),
    borderRadius: s(22, 18),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: s(24, 18),
  },

  nombre: {
    flex: 1,
    fontSize: s(26, 20),
    fontWeight: '400' as const,
    color: '#212121',
    lineHeight: s(34, 26),
  },

  // Fila inferior: los dos botones en fila
  filaBottom: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  // Botón grande — ocupa mitad del ancho cada uno
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 1,
  },
  btnEscuchar: {
    backgroundColor: Colors.ui.background,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
  },
  btnTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
});
