// Tarjeta de tutorial para la lista — título, categoría, formato y progreso
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { formatearDuracion } from '@/services/tutorialesService';
import type { TutorialConProgreso } from '@/types/database.types';

interface TutorialCardProps {
  tutorial: TutorialConProgreso;
  onPress: () => void;
}

export const TutorialCard = memo(function TutorialCard({
  tutorial,
  onPress,
}: TutorialCardProps) {
  const esVideo = tutorial.formato === 'video';
  const progreso = tutorial.progreso;
  const duracion = esVideo ? formatearDuracion(tutorial.duracion_segundos) : null;

  // Porcentaje de progreso para la barra (solo videos)
  const porcentaje =
    esVideo && tutorial.duracion_segundos && (progreso?.segundos_vistos ?? 0) > 0
      ? Math.min((progreso!.segundos_vistos / tutorial.duracion_segundos) * 100, 100)
      : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`Tutorial: ${tutorial.titulo}`}
      accessibilityRole="button"
    >
      {/* Thumbnail o placeholder */}
      <View style={styles.thumbContainer}>
        {tutorial.thumbnail_url ? (
          <Image source={{ uri: tutorial.thumbnail_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbEmoji}>
              {esVideo ? '🎥' : '📷'}
            </Text>
          </View>
        )}
        {/* Ícono de formato sobre el thumb */}
        <View style={styles.formatoBadge}>
          <Ionicons
            name={esVideo ? 'play-circle' : 'images'}
            size={20}
            color={Colors.text.onDark}
          />
        </View>
        {/* Badge completado */}
        {progreso?.completado && (
          <View style={styles.completadoBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        {/* Categoría */}
        <View style={styles.categoriaRow}>
          {tutorial.categoria?.emoji ? (
            <Text style={styles.categoriaEmoji}>{tutorial.categoria.emoji}</Text>
          ) : null}
          <Text style={styles.categoriaNombre} numberOfLines={1}>
            {tutorial.categoria?.nombre ?? 'Tutorial'}
          </Text>
          {/* Estrella favorito */}
          {progreso?.favorito && (
            <Ionicons name="star" size={16} color="#FFC107" style={styles.favStar} />
          )}
        </View>

        {/* Título */}
        <Text style={styles.titulo} numberOfLines={2}>
          {tutorial.titulo}
        </Text>

        {/* Formato y duración */}
        <Text style={styles.formato}>
          {esVideo
            ? `🎥 Video${duracion ? ` · ${duracion}` : ''}`
            : '📷 Guía fotográfica'}
        </Text>

        {/* Barra de progreso (solo si empezó el video) */}
        {porcentaje > 0 && (
          <View style={styles.progresoBar}>
            <View style={[styles.progresoFill, { width: `${porcentaje}%` as any }]} />
          </View>
        )}
      </View>

      {/* Flecha */}
      <Ionicons
        name="chevron-forward"
        size={24}
        color={Colors.ui.border}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    minHeight: 100,
  },
  thumbContainer: {
    position: 'relative',
    width: 100,
    alignSelf: 'stretch',
  },
  thumb: {
    width: 100,
    height: '100%' as any,
    minHeight: 100,
  },
  thumbPlaceholder: {
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 36,
  },
  formatoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Spacing.radius.full,
    padding: 3,
  },
  completadoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.full,
  },
  info: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 5,
  },
  categoriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoriaEmoji: {
    fontSize: 13,
  },
  categoriaNombre: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.brand.greenDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  favStar: {
    marginLeft: 2,
  },
  titulo: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  formato: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
  progresoBar: {
    height: 4,
    backgroundColor: Colors.ui.border,
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  progresoFill: {
    height: 4,
    backgroundColor: Colors.brand.greenMedium,
    borderRadius: 2,
  },
  chevron: {
    marginRight: Spacing.md,
  },
});
