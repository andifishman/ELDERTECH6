// Foto que se ve siempre completa (sin recortar) dentro de un recuadro de
// medidas fijas, sea cual sea el tamaño original. El espacio que sobra se
// rellena con la misma foto difuminada, así no quedan franjas vacías.
import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';

interface FotoCompletaProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
}

export function FotoCompleta({ uri, style }: FotoCompletaProps) {
  return (
    <View style={[styles.marco, style]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={20} />
      <View style={[StyleSheet.absoluteFill, styles.velo]} />
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  marco: { overflow: 'hidden', backgroundColor: Colors.ui.border },
  velo: { backgroundColor: 'rgba(255,255,255,0.35)' },
});
