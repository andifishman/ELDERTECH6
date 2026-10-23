//botón de texto a voz — lee el texto en voz alta al tocar; soporta variantes de estilo y tamaño
import React, { useState, useCallback } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { IconoParlante } from '@/components/common/IconoParlante';
import { hablar, estaHablando } from '@/utils/tts';
import { Colors } from '@/constants/Colors';

type Variante = 'onLight' | 'onDark' | 'chip' | 'escuchar';

interface SpeakButtonProps {
  texto: string;
  label?: string;
  variante?: Variante;
  size?: 'sm' | 'md' | 'lg';
}

export function SpeakButton({ texto, variante = 'onLight', size = 'md' }: SpeakButtonProps) {
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

  const isOnDark = variante === 'onDark';
  // "escuchar" y "chip" eran botones con la palabra "Escuchar": ahora son solo el parlante, igual que el resto.
  const iconSize = variante === 'escuchar' ? 28 : variante === 'chip' ? 24 : size === 'sm' ? 18 : size === 'lg' ? 32 : 22;
  const btnSize = variante === 'escuchar' ? 56 : variante === 'chip' ? 48 : size === 'sm' ? 36 : size === 'lg' ? 64 : 44;

  return (
    <TouchableOpacity
      style={[
        styles.circle,
        { width: btnSize, height: btnSize, borderRadius: btnSize / 2, alignSelf: 'center' },
        isOnDark
          ? (activo ? styles.circleOnDarkActivo : styles.circleOnDark)
          : (activo ? styles.circleActivo : styles.circleIdle),
      ]}
      onPress={handlePress}
      accessibilityLabel={`Escuchar: ${texto}`}
      accessibilityRole="button"
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <IconoParlante size={iconSize} />
    </TouchableOpacity>
  );
}

// Versión para tarjetas — solo el parlante (antes decía "Escuchar" al lado)
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
      style={[styles.rowCirculo, onDark ? styles.rowOnDark : styles.rowOnLight]}
      onPress={handlePress}
      accessibilityLabel={`Escuchar: ${texto}`}
      accessibilityRole="button"
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <IconoParlante size={22} />
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
  rowCirculo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  rowOnLight: {
    backgroundColor: Colors.speak.idleBg,
  },
  rowOnDark: {
    backgroundColor: Colors.speak.onDarkBg,
  },
});
