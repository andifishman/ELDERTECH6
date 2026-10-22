// Fondo animado de Palabras: degradé del mundo + burbujas de luz que suben despacio.
// Todo con transform/opacity (useNativeDriver) para que no pese; si el dispositivo es lento no se nota.
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { MundoPalabras } from '@/constants/mundosPalabras';

const CANTIDAD_BURBUJAS = 14;

// Pseudo-aleatorio determinista: las burbujas no "saltan" cuando se vuelve a renderizar.
const azar = (semilla: number) => {
  const x = Math.sin(semilla * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const Burbuja = memo(function Burbuja({ indice, ancho, alto }: { indice: number; ancho: number; alto: number }) {
  const progreso = useRef(new Animated.Value(0)).current;
  const cfg = useMemo(
    () => ({
      x: azar(indice + 1) * ancho,
      tam: 14 + azar(indice * 3 + 2) * 46,
      duracion: 11000 + azar(indice * 5 + 3) * 12000,
      demora: azar(indice * 7 + 4) * 7000,
    }),
    [indice, ancho],
  );

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(progreso, { toValue: 1, duration: cfg.duracion, delay: cfg.demora, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [progreso, cfg]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.burbuja,
        {
          left: cfg.x,
          width: cfg.tam,
          height: cfg.tam,
          borderRadius: cfg.tam / 2,
          opacity: progreso.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 0.32, 0.2, 0] }),
          transform: [
            { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [alto + 80, -120] }) },
            { translateX: progreso.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 18, -12] }) },
          ],
        },
      ]}
    />
  );
});

export const FondoPalabras = memo(function FondoPalabras({ mundo }: { mundo: MundoPalabras }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={mundo.colores} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      {/* Resplandores suaves, como la luz que entra en los fondos de foto */}
      <View style={[styles.brillo, { top: -height * 0.12, left: -width * 0.25, width: width * 1.1, height: width * 1.1, borderRadius: width }]} />
      <View style={[styles.brillo2, { bottom: -height * 0.1, right: -width * 0.3, width: width * 1.0, height: width * 1.0, borderRadius: width }]} />
      {Array.from({ length: CANTIDAD_BURBUJAS }, (_, i) => (
        <Burbuja key={i} indice={i} ancho={width} alto={height} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  burbuja: { position: 'absolute', backgroundColor: '#FFFFFF' },
  brillo: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.10)' },
  brillo2: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.07)' },
});
