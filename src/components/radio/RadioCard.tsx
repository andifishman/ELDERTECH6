import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useRadioPlayer } from '@/context/RadioContext';
import { useFavoritos } from '@/hooks/useFavoritos';
import type { RadioStation } from '@/types/radio.types';

interface RadioCardProps {
  radio: RadioStation;
  mostrarPais?: boolean;
}

export function RadioCard({ radio, mostrarPais = false }: RadioCardProps) {
  const { alternar, radioActual, estado } = useRadioPlayer();
  const { esFavorito } = useFavoritos();
  const esActiva = radioActual?.id === radio.id;
  const cargando = esActiva && estado === 'loading';
  const reproduciendo = esActiva && estado === 'playing';
  const hayError = esActiva && estado === 'error';
  const esFav = esFavorito(radio.id);

  return (
    <TouchableOpacity
      style={[styles.card, reproduciendo && styles.cardActiva, esFav && !reproduciendo && styles.cardFavorita]}
      onPress={() => router.push(`/mas/radio/${radio.id}`)}
      activeOpacity={0.85}
      accessibilityLabel={`Ver detalle de ${radio.nombre}`}
      accessibilityRole="button"
    >
      {/* Ícono / emoji de categoría */}
      <View style={[styles.iconoContainer, reproduciendo && styles.iconoContainerActivo]}>
        <Text style={styles.icono}>{radio.categoriaEmoji ?? '📻'}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nombreRow}>
          <Text style={[styles.nombre, reproduciendo && styles.nombreActivo]} numberOfLines={1}>
            {radio.nombre}
          </Text>
          {esFav && (
            <View style={styles.favBadge}>
              <Ionicons name="heart" size={18} color="#fff" />
            </View>
          )}
        </View>

        {radio.descripcion ? (
          <Text style={styles.descripcion} numberOfLines={1}>
            {radio.descripcion}
          </Text>
        ) : null}

        {/* texto de ayuda — explica que la tarjeta lleva al detalle y el botón verde reproduce */}
        <Text style={styles.ayuda}>
          {reproduciendo
            ? '🟢 Sonando ahora — tocá el botón rojo para parar'
            : cargando
            ? '⏳ Conectando...'
            : '▶ Tocá el botón verde para escuchar'}
        </Text>

        <View style={styles.badgesRow}>
          {radio.categoriaEmoji && radio.categoria ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{radio.categoria}</Text>
            </View>
          ) : null}
          {mostrarPais && radio.paisEmoji ? (
            <View style={[styles.badge, styles.badgePais]}>
              <Text style={styles.badgeText}>
                {radio.paisEmoji} {radio.paisNombre}
              </Text>
            </View>
          ) : null}
          {hayError ? (
            <View style={[styles.badge, styles.badgeError]}>
              <Text style={[styles.badgeText, styles.badgeErrorText]}>Sin señal</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Botón play / stop */}
      <TouchableOpacity
        style={[styles.playBtn, reproduciendo && styles.playBtnActivo]}
        onPress={(e) => {
          e.stopPropagation?.();
          alternar(radio);
        }}
        activeOpacity={0.75}
        accessibilityLabel={reproduciendo ? `Detener ${radio.nombre}` : `Reproducir ${radio.nombre}`}
        accessibilityRole="button"
        accessibilityState={{ selected: reproduciendo }}
      >
        {cargando ? (
          <ActivityIndicator size="large" color={Colors.text.onDark} />
        ) : (
          <Ionicons
            name={reproduciendo ? 'stop' : 'play'}
            size={26}
            color={Colors.text.onDark}
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
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
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 80,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardActiva: {
    borderColor: Colors.radio.playButton,
    backgroundColor: '#F0FAF0',
    elevation: 3,
    shadowOpacity: 0.15,
  },
  cardFavorita: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  iconoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconoContainerActivo: {
    backgroundColor: '#D0EDD0',
  },
  icono: {
    fontSize: 26,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nombreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  favBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Nombre de la radio — grande y legible
  nombre: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  nombreActivo: {
    color: Colors.radio.playButton,
  },
  descripcion: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  //texto de ayuda debajo de la descripción
  ayuda: {
    fontSize: Typography.size.xs,
    color: Colors.text.hint,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.ui.background,
    borderRadius: Spacing.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgePais: {
    backgroundColor: '#E8F0FF',
  },
  badgeError: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  badgeErrorText: {
    color: Colors.brand.red,
  },
  playBtn: {
    width: Spacing.touch.comfortable,
    height: Spacing.touch.comfortable,
    borderRadius: Spacing.touch.comfortable / 2,
    backgroundColor: Colors.radio.playButton,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  playBtnActivo: {
    backgroundColor: Colors.brand.red,
  },
});
