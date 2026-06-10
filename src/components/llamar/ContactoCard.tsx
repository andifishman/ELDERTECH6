// Tarjeta de contacto — foto cuadrada completa + nombre abajo
// Los botones de acción están en la pantalla de detalle
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { ContactoResumen } from '@/types/database.types';

const SCREEN_W = Dimensions.get('window').width;
const TILE_SIZE = (SCREEN_W - Spacing.screen.horizontal * 2 - Spacing.lg) / 2;

interface ContactoCardProps {
  contacto: ContactoResumen;
  onPress: () => void;
  onToggleFavorito: (id: string, nuevoValor: boolean) => void;
}

export const ContactoCard = memo(function ContactoCard({
  contacto,
  onPress,
  onToggleFavorito,
}: ContactoCardProps) {
  const nombreCompleto = contacto.apellido
    ? `${contacto.nombre} ${contacto.apellido}`
    : contacto.nombre;

  const iniciales =
    contacto.nombre.charAt(0).toUpperCase() +
    (contacto.apellido ? contacto.apellido.charAt(0).toUpperCase() : '');

  return (
    <TouchableOpacity
      style={[styles.tile, { width: TILE_SIZE }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Ver contacto ${nombreCompleto}`}
      accessibilityRole="button"
    >
      {/* ── Foto / iniciales — ocupa todo el cuadrado ── */}
      <View style={styles.fotoWrapper}>
        {contacto.foto_url ? (
          <Image
            source={{ uri: contacto.foto_url }}
            style={styles.foto}
            accessibilityLabel={`Foto de ${nombreCompleto}`}
          />
        ) : (
          <View style={styles.fotoFallback}>
            <Text style={styles.iniciales}>{iniciales}</Text>
          </View>
        )}

        {/* Estrella favorito — esquina superior derecha */}
        <TouchableOpacity
          style={styles.favBtn}
          onPress={(e) => { e.stopPropagation(); onToggleFavorito(contacto.id, !contacto.favorito); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={contacto.favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
          accessibilityRole="button"
        >
          <Ionicons
            name={contacto.favorito ? 'star' : 'star-outline'}
            size={26}
            color={contacto.favorito ? '#FFC107' : 'rgba(255,255,255,0.7)'}
          />
        </TouchableOpacity>
      </View>

      {/* ── Nombre debajo ── */}
      <View style={styles.nombreWrapper}>
        <Text style={styles.nombre} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
          {nombreCompleto}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  // Foto cuadrada que ocupa todo el ancho del tile
  fotoWrapper: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  foto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fotoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#66BB6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: {
    fontSize: 58,
    fontWeight: Typography.weight.heavy,
    color: Colors.text.onDark,
    letterSpacing: 2,
  },

  // Estrella favorito flotando sobre la foto
  favBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nombre
  nombreWrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  nombre: {
    fontSize: Typography.size.xl,    // 24px
    fontWeight: Typography.weight.heavy,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 30,
  },
});
