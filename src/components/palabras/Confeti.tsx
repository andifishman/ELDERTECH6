// Lluvia de confeti para festejar un nivel completado (transform/opacity nativos, se autodestruye al terminar).
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

const COLORES = ['#FFD54F', '#FF6F91', '#4FC3F7', '#81C784', '#BA68C8', '#FF8A65', '#FFFFFF'];
const PIEZAS = 34;

const azar = (semilla: number) => {
  const x = Math.sin(semilla * 78.233) * 12345.6789;
  return x - Math.floor(x);
};

const Pieza = memo(function Pieza({ indice, ancho, alto }: { indice: number; ancho: number; alto: number }) {
  const progreso = useRef(new Animated.Value(0)).current;
  const cfg = useMemo(
    () => ({
      x: azar(indice + 1) * ancho,
      tam: 8 + azar(indice * 2 + 1) * 10,
      color: COLORES[indice % COLORES.length],
      duracion: 2400 + azar(indice * 3 + 1) * 1800,
      demora: azar(indice * 5 + 1) * 700,
      balanceo: (azar(indice * 7 + 1) - 0.5) * 120,
      giros: 2 + Math.floor(azar(indice * 11 + 1) * 4),
    }),
    [indice, ancho],
  );

  useEffect(() => {
    Animated.timing(progreso, { toValue: 1, duration: cfg.duracion, delay: cfg.demora, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
  }, [progreso, cfg]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -30,
        left: cfg.x,
        width: cfg.tam,
        height: cfg.tam * 0.6,
        backgroundColor: cfg.color,
        borderRadius: 2,
        opacity: progreso.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [0, alto + 60] }) },
          { translateX: progreso.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.balanceo] }) },
          { rotate: progreso.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${cfg.giros * 360}deg`] }) },
        ],
      }}
    />
  );
});

export function Confeti() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PIEZAS }, (_, i) => (
        <Pieza key={i} indice={i} ancho={width} alto={height} />
      ))}
    </View>
  );
}
