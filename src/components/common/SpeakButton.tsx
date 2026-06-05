//botón de texto a voz — lee el texto en voz alta al tocar; soporta variantes de estilo y tamaño
import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hablar, estaHablando } from '@/utils/tts';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

type Variante = 'onLight' | 'onDark' | 'chip' | 'escuchar';

interface SpeakButtonProps {
  texto: string;
  label?: string;
  variante?: Variante;
  size?: 'sm' | 'md' | 'lg';
}

export function SpeakButton({ texto, label = 'Escuchar', variante = 'onLight', size = 'md' }: SpeakButtonProps) {
  const [activo, setActivo] = useState(false);

  const handlePress = useCallback(async () => {
    const hablando = await estaHablando();
    if (hablando && activo) {
      setActivo(false);
    } else {
      setActivo(true);
    }
    await hablar(texto);
    setActivo(false);
  }, [texto, activo]);

  if (variante === 'escuchar') {
    return (
      <TouchableOpacity
        style={[styles.escucharBtn, activo && styles.escucharBtnActivo]}
        onPress={handlePress}
        accessibilityLabel={`Escuchar: ${texto}`}
        accessibilityRole="button"
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Ionicons
          name={activo ? 'volume-high' : 'volume-medium'}
          size={22}
          color={activo ? Colors.speak.active : '#1B5E3B'}
        />
        <Text style={[styles.escucharLabel, activo && styles.escucharLabelActivo]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variante === 'chip') {
    return (
      <TouchableOpacity
        style={[styles.chip, activo && styles.chipActivo]}
        onPress={handlePress}
        accessibilityLabel={`Escuchar: ${texto}`}
        accessibilityRole="button"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons
          name={activo ? 'volume-high' : 'volume-medium-outline'}
          size={16}
          color={activo ? Colors.speak.active : Colors.brand.greenDark}
        />
        <Text style={[styles.chipLabel, activo && styles.chipLabelActivo]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  const isOnDark = variante === 'onDark';
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 22;
  const btnSize = size === 'sm' ? 36 : size === 'lg' ? 64 : 44;

  return (
    <TouchableOpacity
      style={[
        styles.circle,
        { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
        isOnDark
          ? (activo ? styles.circleOnDarkActivo : styles.circleOnDark)
          : (activo ? styles.circleActivo : styles.circleIdle),
      ]}
      onPress={handlePress}
      accessibilityLabel={`Escuchar: ${texto}`}
      accessibilityRole="button"
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Ionicons
        name={activo ? 'volume-high' : 'volume-medium-outline'}
        size={iconSize}
        color={isOnDark ? Colors.text.onDark : (activo ? Colors.speak.active : Colors.speak.idle)}
      />
    </TouchableOpacity>
  );
}

// Versión mini para tarjetas — solo muestra "Escuchar" + icono horizontal
interface SpeakRowProps {
  texto: string;
  onDark?: boolean;
}
export function SpeakRow({ texto, onDark = false }: SpeakRowProps) {
  const [activo, setActivo] = useState(false);

  const handlePress = useCallback(async () => {
    setActivo((v) => !v);
    await hablar(texto);
    setActivo(false);
  }, [texto]);

  return (
    <TouchableOpacity
      style={[styles.row, onDark ? styles.rowOnDark : styles.rowOnLight]}
      onPress={handlePress}
      accessibilityLabel={`Escuchar: ${texto}`}
      accessibilityRole="button"
    >
      <Text style={[styles.rowLabel, { color: onDark ? Colors.text.onDark : Colors.speak.idle }]}>
        Escuchar
      </Text>
      <Ionicons
        name={activo ? 'volume-high' : 'volume-medium-outline'}
        size={14}
        color={onDark ? Colors.text.onDark : Colors.speak.idle}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIdle: {
    backgroundColor: Colors.speak.idleBg,
  },
  circleActivo: {
    backgroundColor: Colors.speak.activeBg,
  },
  circleOnDark: {
    backgroundColor: Colors.speak.onDarkBg,
  },
  circleOnDarkActivo: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  chipActivo: {
    backgroundColor: 'rgba(230,81,0,0.12)',
    borderColor: Colors.speak.active,
  },
  chipLabel: {
    ...Typography.styles.speakLabel,
    color: Colors.brand.greenDark,
  },
  chipLabelActivo: {
    color: Colors.speak.active,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.radius.full,
    alignSelf: 'flex-start',
  },
  rowOnLight: {
    backgroundColor: Colors.speak.idleBg,
  },
  rowOnDark: {
    backgroundColor: Colors.speak.onDarkBg,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Variante "escuchar" — rectangular, fondo verde claro, texto verde oscuro
  escucharBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    elevation: 0,
  },
  escucharBtnActivo: {
    backgroundColor: Colors.speak.activeBg,
  },
  escucharLabel: {
    fontSize: 16,
    fontWeight: Typography.weight.bold,
    color: '#1B5E3B',
  },
  escucharLabelActivo: {
    color: Colors.speak.active,
  },
});
