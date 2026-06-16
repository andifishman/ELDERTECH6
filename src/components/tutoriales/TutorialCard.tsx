// Tarjeta de tutorial para la lista — foto grande, título, categoría y CTA "Ver tutorial"
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { SpeakButton } from '@/components/common/SpeakButton';
import { TutorialImage } from './TutorialImage';
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
  const duracion = esVideo ? formatearDuracion(tutorial.duracion_segundos) : '';

  const porcentaje =
    esVideo && tutorial.duracion_segundos && (progreso?.segundos_vistos ?? 0) > 0
      ? Math.min((progreso!.segundos_vistos / tutorial.duracion_segundos) * 100, 100)
      : 0;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel={`Tutorial: ${tutorial.titulo}`}
        accessibilityRole="button"
      >
        {/* Foto temática (con fallback) */}
        <View style={styles.mediaWrap}>
          <TutorialImage
            uri={tutorial.thumbnail_url}
            fallbackSeed={tutorial.id}
            categoria={tutorial.categoria?.nombre}
            iconSize={48}
            style={styles.media}
          />

          <View style={styles.formatoBadge}>
            <Ionicons name={esVideo ? 'play' : 'images'} size={13} color={Colors.text.onDark} />
            <Text style={styles.formatoBadgeTexto}>{esVideo ? 'VIDEO' : 'GUÍA'}</Text>
          </View>

          {progreso?.favorito && (
            <View style={styles.favBadge}>
              <Ionicons name="star" size={18} color="#FFC107" />
            </View>
          )}

          {progreso?.completado && (
            <View style={styles.completadoBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            </View>
          )}

          {porcentaje > 0 && (
            <View style={styles.progresoTrack}>
              <View style={[styles.progresoFill, { width: `${porcentaje}%` as `${number}%` }]} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.metaRow}>
            <Text style={styles.categoriaNombre} numberOfLines={1}>
              {tutorial.categoria?.nombre ?? 'Tutorial'}
            </Text>
            <Text style={styles.punto}>·</Text>
            <Text style={styles.metaTexto}>{esVideo ? (duracion || 'Video') : 'Guía paso a paso'}</Text>
          </View>
          <Text style={styles.titulo} numberOfLines={2}>
            {tutorial.titulo}
          </Text>
        </View>
      </TouchableOpacity>

      {/* CTA */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={onPress}
          activeOpacity={0.85}
          accessibilityLabel={`Ver tutorial: ${tutorial.titulo}`}
          accessibilityRole="button"
        >
          <Text style={styles.ctaTexto}>Ver tutorial</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.onDark} />
        </TouchableOpacity>
        <SpeakButton texto={`${tutorial.titulo}. ${tutorial.descripcion ?? ''}`} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  mediaWrap: {
    position: 'relative',
    width: '100%',
    height: 170,
  },
  media: {
    width: '100%',
    height: 170,
  },
  formatoBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  formatoBadgeTexto: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    letterSpacing: 0.5,
  },
  favBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.full,
    padding: 6,
  },
  completadoBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.full,
  },
  progresoTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  progresoFill: {
    height: 4,
    backgroundColor: Colors.brand.greenMedium,
  },
  info: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriaNombre: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  punto: {
    color: Colors.text.hint,
    marginHorizontal: 5,
  },
  metaTexto: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
  titulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    lineHeight: 26,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.brand.purple,
    borderRadius: Spacing.radius.lg,
    minHeight: Spacing.touch.min,
    paddingVertical: Spacing.md,
  },
  ctaTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
});
