// Tarjeta de contacto para la lista principal — foto + nombre + botón favorito
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { ContactoResumen } from '@/types/database.types';

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

  const iniciales = contacto.nombre.charAt(0).toUpperCase() +
    (contacto.apellido ? contacto.apellido.charAt(0).toUpperCase() : '');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`Ver contacto ${nombreCompleto}`}
      accessibilityRole="button"
    >
      {/* Foto o iniciales */}
      <View style={styles.avatarWrapper}>
        {contacto.foto_url ? (
          <Image
            source={{ uri: contacto.foto_url }}
            style={styles.avatar}
            accessibilityLabel={`Foto de ${nombreCompleto}`}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarIniciales}>{iniciales}</Text>
          </View>
        )}
        {/* Badge de tipo de contacto */}
        {contacto.tipo_contacto?.emoji ? (
          <View style={styles.tipoBadge}>
            <Text style={styles.tipoEmoji}>{contacto.tipo_contacto.emoji}</Text>
          </View>
        ) : null}
      </View>

      {/* Nombre */}
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={2}>
          {nombreCompleto}
        </Text>
        {contacto.tipo_contacto?.nombre ? (
          <Text style={styles.tipo}>{contacto.tipo_contacto.nombre}</Text>
        ) : null}
      </View>

      {/* Estrella favorito */}
      <TouchableOpacity
        style={styles.favBtn}
        onPress={() => onToggleFavorito(contacto.id, !contacto.favorito)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={
          contacto.favorito ? 'Quitar de favoritos' : 'Marcar como favorito'
        }
        accessibilityRole="button"
      >
        <Ionicons
          name={contacto.favorito ? 'star' : 'star-outline'}
          size={28}
          color={contacto.favorito ? '#FFC107' : Colors.ui.border}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    minHeight: Spacing.touch.large,
    gap: Spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.ui.border,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#66BB6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIniciales: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  tipoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.ui.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tipoEmoji: {
    fontSize: 14,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nombre: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    lineHeight: 26,
  },
  tipo: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text.secondary,
  },
  favBtn: {
    width: Spacing.touch.min,
    height: Spacing.touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
