//ícono de parlante único de la app (el 🔊 gris con ondas azules) — reemplaza a los parlantes de Ionicons
import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

interface IconoParlanteProps {
  size?: number;
  apagado?: boolean;
  style?: StyleProp<TextStyle>;
}

export function IconoParlante({ size = 22, apagado = false, style }: IconoParlanteProps) {
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      style={[{ fontSize: size, lineHeight: Math.round(size * 1.25), opacity: apagado ? 0.35 : 1 }, style]}
    >
      🔊
    </Text>
  );
}
