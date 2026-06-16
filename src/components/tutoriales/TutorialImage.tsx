// Imagen de tutorial con foto temática + fallback garantizado.
// Replica la estrategia del diseño de ElderTech: si la foto temática (loremflickr,
// guardada en la DB) no carga, mostramos una foto real de respaldo (picsum) usando
// una semilla estable; y si tampoco hay nada, un placeholder con ícono de categoría.
import React, { memo, useState } from 'react';
import { View, Image, StyleSheet, type StyleProp, type ImageStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { getIconoCategoria } from './categoriaIcono';

interface TutorialImageProps {
  uri: string | null | undefined;
  /** Semilla estable para el fallback fotográfico (id del tutorial o del paso). */
  fallbackSeed: string;
  /** Categoría — define el ícono del placeholder final. */
  categoria?: string | null;
  /** Tamaño del ícono del placeholder. */
  iconSize?: number;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain';
  accessibilityLabel?: string;
}

function picsumFallback(seed: string): string {
  return `https://picsum.photos/seed/eldertech-${encodeURIComponent(seed)}/640/420`;
}

export const TutorialImage = memo(function TutorialImage({
  uri,
  fallbackSeed,
  categoria,
  iconSize = 40,
  style,
  placeholderStyle,
  resizeMode = 'cover',
  accessibilityLabel,
}: TutorialImageProps) {
  // 0 = uri original · 1 = fallback picsum · 2 = placeholder con ícono
  const [etapa, setEtapa] = useState<0 | 1 | 2>(uri ? 0 : 2);

  if (etapa === 2) {
    return (
      <View style={[styles.placeholder, style, placeholderStyle]}>
        <Ionicons name={getIconoCategoria(categoria)} size={iconSize} color={Colors.brand.purple} />
      </View>
    );
  }

  const source = etapa === 0 ? uri! : picsumFallback(fallbackSeed);

  return (
    <Image
      source={{ uri: source }}
      style={style}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel}
      accessible={!!accessibilityLabel}
      onError={() => setEtapa((e) => (e === 0 ? 1 : 2))}
    />
  );
});

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.tutoriales.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
