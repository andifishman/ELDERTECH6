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

      {/* Botón pausar — cuadrado redondeado con ícono + texto "Pausar" adentro */}
      <TouchableOpacity
        style={styles.stopBtn}
        onPress={detener}
        accessibilityLabel="Pausar radio"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="stop" size={26} color={Colors.text.onDark} />
        <Text style={styles.stopBtnTexto}>Pausar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.radio.nowPlayingBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  indicadorWrapper: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicador: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  indicadorPulso: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(76,175,80,0.35)',
  },
  indicadorError: {
    backgroundColor: Colors.brand.red,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  estadoLabel: {
    fontSize: Typography.size.sm,   // subido de 10 a sm(15)
    fontWeight: Typography.weight.bold,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.2,
  },
  nombre: {
    fontSize: Typography.size.xl,   // subido de lg(20) a xl(24)
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  detalle: {
    fontSize: Typography.size.md,   // subido de sm(15) a md(18)
    color: Colors.text.onDarkSecondary,
  },
  // Botón cuadrado redondeado con ícono + "Pausar" adentro
  stopBtn: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flexShrink: 0,
  },
  stopBtnTexto: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.onDark,
  },
});
