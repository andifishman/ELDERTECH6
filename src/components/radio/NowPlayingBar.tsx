import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useRadioPlayer } from '@/context/RadioContext';

export function NowPlayingBar() {
  const { radioActual, estado, detener } = useRadioPlayer();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulso animado en el indicador verde cuando está reproduciendo
  useEffect(() => {
    if (estado !== 'playing') {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [estado, pulseAnim]);

  if (!radioActual || estado === 'idle') return null;

  const esCargando = estado === 'loading';
  const hayError = estado === 'error';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.sm }]}>
      {/* Indicador de estado */}
      <View style={styles.indicadorWrapper}>
        <Animated.View
          style={[
            styles.indicadorPulso,
            { transform: [{ scale: pulseAnim }] },
            hayError && styles.indicadorError,
          ]}
        />
        <View style={[styles.indicador, hayError && styles.indicadorError]} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.estadoLabel}>
          {esCargando ? 'CONECTANDO...' : hayError ? 'SIN SEÑAL' : 'EN VIVO'}
        </Text>
        <Text style={styles.nombre} numberOfLines={1}>
          {radioActual.nombre}
        </Text>
        {radioActual.paisEmoji && radioActual.categoria ? (
          <Text style={styles.detalle} numberOfLines={1}>
            {radioActual.paisEmoji}  {radioActual.categoria}
          </Text>
        ) : null}
      </View>

      {/* Botón detener */}
      <TouchableOpacity
        style={styles.stopBtn}
        onPress={detener}
        accessibilityLabel="Detener radio"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="stop" size={22} color={Colors.text.onDark} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.radio.nowPlayingBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  indicadorWrapper: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicador: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  indicadorPulso: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(76,175,80,0.35)',
  },
  indicadorError: {
    backgroundColor: Colors.brand.red,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  estadoLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.2,
  },
  nombre: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  detalle: {
    fontSize: Typography.size.sm,
    color: Colors.text.onDarkSecondary,
  },
  stopBtn: {
    width: Spacing.touch.comfortable,
    height: Spacing.touch.comfortable,
    borderRadius: Spacing.touch.comfortable / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
