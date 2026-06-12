// Tarjeta de contacto — foto cuadrada completa + nombre abajo
// Los botones de acción están en la pantalla de detalle
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { ContactoResumen } from '@/types/database.types';

interface ContactoCardProps {
  contacto: ContactoResumen;
  // Recibe el contacto para que el padre pueda pasar un callback estable
  // (un arrow inline por item anularía React.memo)
  onPress: (contacto: ContactoResumen) => void;
  onToggleFavorito: (id: string, nuevoValor: boolean) => void;
}

export const ContactoCard = memo(function ContactoCard({
  contacto,
  onPress,
  onToggleFavorito,
}: ContactoCardProps) {
  const { width: screenW } = useWindowDimensions();
  const tileSize = (Math.min(screenW, 480) - Spacing.screen.horizontal * 2 - Spacing.lg) / 2;

  const nombreCompleto = contacto.apellido
    ? `${contacto.nombre} ${contacto.apellido}`
    : contacto.nombre;

  const iniciales =
    contacto.nombre.charAt(0).toUpperCase() +
    (contacto.apellido ? contacto.apellido.charAt(0).toUpperCase() : '');

  // En web, TouchableOpacity se renderiza como <button>.
  // Para evitar nested buttons, la estrella de favorito va FUERA del TouchableOpacity
  // posicionada absolutamente sobre el tile con zIndex.
  return (
    <View style={[styles.tile, { width: tileSize }]}>
      {/* Área principal clickeable */}
      <TouchableOpacity
        style={styles.tileInner}
        onPress={() => onPress(contacto)}
        activeOpacity={0.8}
        accessibilityLabel={`Ver contacto ${nombreCompleto}`}
        accessibilityRole="button"
      >
        {/* Foto / iniciales */}
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
        </View>

        {/* Nombre debajo */}
        <View style={styles.nombreWrapper}>
          <Text style={styles.nombre} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
            {nombreCompleto}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Estrella favorito — posicionada absolutamente sobre el tile, FUERA del button */}
      <TouchableOpacity
        style={styles.favBtn}
        onPress={() => onToggleFavorito(contacto.id, !contacto.favorito)}
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
    // position relative para que el favBtn absoluto se posicione dentro
    ...Platform.select({ web: { position: 'relative' as const } }),
  },
  tileInner: {
    width: '100%',
  },

  // Foto cuadrada que ocupa todo el ancho del tile
  fotoWrapper: {
    width: '100%',
    aspectRatio: 1,
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

  // Estrella favorito — posición absoluta sobre la foto, fuera del TouchableOpacity principal
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
    zIndex: 10,
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
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.heavy,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 30,
  },
});
