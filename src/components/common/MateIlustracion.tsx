//Mate, la mascota de ElderTech, dibujado con vistas nativas (sin emojis ni imágenes: se ve igual en cualquier Android/iPhone y en la web).
//Es el mismo personaje de la 404 del backoffice y de public/404.html. Flota despacio y le sale vapor; con "reducir movimiento" queda quieto.
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export type EstadoMate = 'perdido' | 'feliz';

interface Props {
  /** Alto aproximado en px (el ancho es ~77 % de esto). */
  tamano?: number;
  estado?: EstadoMate;
}

export function MateIlustracion({ tamano = 130, estado = 'perdido' }: Props) {
  const u = tamano / 130; // unidad: 1u = tamano/130 px
  const flota = useRef(new Animated.Value(0)).current;
  const vapor = useRef(new Animated.Value(0)).current;
  const late = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelado = false;
    const animaciones: Animated.CompositeAnimation[] = [];
    void AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      if (cancelado || reducir) return;
      const lazo = (v: Animated.Value, ms: number, ida = true) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ...(ida ? [Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true })] : [Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })]),
          ]),
        );
      animaciones.push(lazo(flota, 2200), lazo(vapor, 2600, false), lazo(late, 800));
      animaciones.forEach((a) => a.start());
    });
    return () => {
      cancelado = true;
      animaciones.forEach((a) => a.stop());
    };
  }, [flota, vapor, late]);

  const sube = flota.interpolate({ inputRange: [0, 1], outputRange: [0, -6 * u] });
  const vaporY = vapor.interpolate({ inputRange: [0, 1], outputRange: [10 * u, -14 * u] });
  const vaporOp = vapor.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0] });
  const escala = late.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });

  const feliz = estado === 'feliz';

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: 100 * u, height: 130 * u }}
    >
      <Animated.View style={{ width: 100 * u, height: 130 * u, transform: [{ translateY: sube }] }}>
        {/* vapor */}
        {[22, 42].map((x, i) => (
          <Animated.View
            key={x}
            style={{
              position: 'absolute', left: x * u, top: 6 * u + i * 4 * u, width: 4 * u, height: 22 * u, borderRadius: 4 * u,
              backgroundColor: Colors.brand.primarySoft, opacity: vaporOp, transform: [{ translateY: vaporY }],
            }}
          />
        ))}
        {/* corazón */}
        <Animated.View style={{ position: 'absolute', left: 64 * u, top: -2 * u, transform: [{ scale: escala }] }}>
          <Ionicons name="heart" size={Math.round(20 * u)} color="#E0709A" />
        </Animated.View>
        {/* bombilla */}
        <View
          style={{
            position: 'absolute', left: 62 * u, top: 6 * u, width: 5 * u, height: 62 * u, borderRadius: 3 * u,
            backgroundColor: '#C9CED6', transform: [{ rotate: '24deg' }],
          }}
        />
        {/* mate */}
        <View
          style={{
            position: 'absolute', left: 10 * u, top: 48 * u, width: 80 * u, height: 82 * u, backgroundColor: Colors.brand.primary,
            borderTopLeftRadius: 16 * u, borderTopRightRadius: 16 * u, borderBottomLeftRadius: 40 * u, borderBottomRightRadius: 40 * u,
          }}
        >
          {/* brillo */}
          <View style={{ position: 'absolute', left: 8 * u, top: 14 * u, width: 5 * u, height: 40 * u, borderRadius: 3 * u, backgroundColor: '#FFFFFF', opacity: 0.2 }} />
          {/* ojos */}
          {[22, 48].map((x) => (
            <View key={x} style={{ position: 'absolute', left: x * u, top: 36 * u, width: 15 * u, height: 17 * u, borderRadius: 9 * u, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              {feliz ? (
                <View style={{ width: 11 * u, height: 6 * u, borderTopLeftRadius: 6 * u, borderTopRightRadius: 6 * u, borderTopWidth: 3 * u, borderColor: Colors.brand.primary }} />
              ) : (
                <View style={{ width: 8 * u, height: 8 * u, borderRadius: 4 * u, backgroundColor: '#2C1D44', marginTop: 3 * u, marginLeft: 2 * u }} />
              )}
            </View>
          ))}
          {/* boca: ∩ = un poco perdido, ∪ = contento */}
          <View
            style={
              feliz
                ? { position: 'absolute', left: 31 * u, top: 60 * u, width: 18 * u, height: 9 * u, borderBottomLeftRadius: 9 * u, borderBottomRightRadius: 9 * u, borderBottomWidth: 3.5 * u, borderColor: '#FFFFFF' }
                : { position: 'absolute', left: 31 * u, top: 62 * u, width: 18 * u, height: 9 * u, borderTopLeftRadius: 9 * u, borderTopRightRadius: 9 * u, borderTopWidth: 3.5 * u, borderColor: '#FFFFFF' }
            }
          />
          {/* cachetes */}
          <View style={{ position: 'absolute', left: 8 * u, top: 56 * u, width: 12 * u, height: 7 * u, borderRadius: 6 * u, backgroundColor: '#E0709A', opacity: 0.55 }} />
          <View style={{ position: 'absolute', right: 8 * u, top: 56 * u, width: 12 * u, height: 7 * u, borderRadius: 6 * u, backgroundColor: '#E0709A', opacity: 0.55 }} />
        </View>
        {/* yerba */}
        <View style={{ position: 'absolute', left: 6 * u, top: 40 * u, width: 88 * u, height: 22 * u, borderRadius: 44 * u, backgroundColor: '#5C8A3A' }} />
      </Animated.View>
    </View>
  );
}
