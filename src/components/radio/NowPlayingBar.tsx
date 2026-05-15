import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useRadioPlayer } from '@/context/RadioContext';

export function NowPlayingBar() {
  const { radioActual, estado, detener } = useRadioPlayer();
  const insets = useSafeAreaInsets();

  if (!radioActual || estado === 'idle') return null;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.sm }]}>
      <View style={styles.dot} />
      <View style={styles.info}>
        <Text style={styles.label}>EN VIVO</Text>
        <Text style={styles.nombre} numberOfLines={1}>
          {radioActual.nombre}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.stopButton}
        onPress={detener}
        accessibilityLabel="Detener radio"
        accessibilityRole="button"
      >
        <Ionicons name="stop" size={20} color={Colors.text.onDark} />
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  nombre: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.onDark,
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
