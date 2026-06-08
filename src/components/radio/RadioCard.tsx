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
  /** Si es true, elimina el marginHorizontal de la card (para usarla dentro de contenedores con padding propio) */
  sinMargen?: boolean;
}

export function RadioCard({ radio, mostrarPais = false, sinMargen = false }: RadioCardProps) {
  const { alternar, radioActual, estado } = useRadioPlayer();
  const { esFavorito } = useFavoritos();
  const esActiva = radioActual?.id === radio.id;
  const cargando = esActiva && estado === 'loading';
  const reproduciendo = esActiva && estado === 'playing';
  const hayError = esActiva && estado === 'error';
  const esFav = esFavorito(radio.id);

  return (
    // La card es un View simple — no se puede tocar para navegar
    <View style={[styles.card, sinMargen && styles.cardSinMargen, reproduciendo && styles.cardActiva, esFav && !reproduciendo && styles.cardFavorita]}>

      {/* Ícono / emoji de categoría */}
      <View style={[styles.iconoContainer, reproduciendo && styles.iconoContainerActivo]}>
        <Text style={styles.icono}>{radio.categoriaEmoji ?? '📻'}</Text>
      </View>

      {/* Info — solo texto, no navegable */}
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
          // Sin límite de líneas para que se lea la descripción completa
          <Text style={styles.descripcion}>
            {radio.descripcion}
          </Text>
        ) : null}

        <View style={styles.badgesRow}>
          {(() => {
            const partes: string[] = [];
            if (radio.categoriaEmoji && radio.categoria) partes.push(radio.categoria);
            if (mostrarPais && radio.paisEmoji) partes.push(`${radio.paisEmoji} ${radio.paisNombre}`);
            if (hayError) return (
              <Text style={[styles.badgeText, styles.badgeErrorText]}>Sin señal</Text>
            );
            if (partes.length === 0) return null;
            return <Text style={styles.badgeText} numberOfLines={1}>{partes.join(' · ')}</Text>;
          })()}
        </View>
      </View>

      {/* Columna de botones: Escuchar arriba, Entrar abajo */}
      <View style={styles.botonesCol}>

        {/* Botón Escuchar / Detener */}
        <TouchableOpacity
          style={[styles.playBtn, reproduciendo && styles.playBtnActivo]}
          onPress={() => alternar(radio)}
          activeOpacity={0.75}
          accessibilityLabel={reproduciendo ? `Detener ${radio.nombre}` : `Escuchar ${radio.nombre}`}
          accessibilityRole="button"
          accessibilityState={{ selected: reproduciendo }}
        >
          {cargando ? (
            <ActivityIndicator size="small" color={Colors.text.onDark} />
          ) : (
            <Ionicons
              name={reproduciendo ? 'stop' : 'play'}
              size={24}
              color={Colors.text.onDark}
            />
          )}
          <Text style={styles.playBtnTexto}>
            {cargando ? '...' : reproduciendo ? 'Detener' : 'Escuchar radio'}
          </Text>
        </TouchableOpacity>

        {/* Botón Entrar — lleva al detalle de la radio */}
        <TouchableOpacity
          style={styles.entrarBtn}
          onPress={() => router.push(`/mas/radio/${radio.id}`)}
          activeOpacity={0.75}
          accessibilityLabel={`Ver detalle de ${radio.nombre}`}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.text.onDark} />
          <Text style={styles.entrarBtnTexto}>Entrar</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tarjeta — ya no es tocable, solo es contenedor visual
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
  // Sin margen horizontal — para usar dentro de contenedores que ya tienen padding
  cardSinMargen: {
    marginHorizontal: 0,
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
  nombre: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  nombreActivo: {
    color: Colors.radio.playButton,
  },
  descripcion: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  badgesRow: {
    marginTop: 4,
  },
  badge: {},
  badgePais: {},
  badgeError: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  badgeErrorText: {
    color: Colors.brand.red,
  },

  // Columna con los dos botones apilados verticalmente
  botonesCol: {
    flexDirection: 'column',
    gap: Spacing.sm,
    flexShrink: 0,
  },

  // Botón Escuchar radio — cuadrado redondeado verde
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: Colors.radio.playButton,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    gap: 2,
  },
  playBtnActivo: {
    backgroundColor: Colors.brand.red,
  },
  playBtnTexto: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
  },

  // Botón Entrar — mismo tamaño que Escuchar radio
  entrarBtn: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: Colors.brand.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    gap: 2,
  },
  entrarBtnTexto: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
  },
});
