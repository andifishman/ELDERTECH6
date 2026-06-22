import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { NivelDificultad } from '@/types/database.types';

const OPCIONES: { value: NivelDificultad; label: string; color: string }[] = [
  { value: 'independiente', label: 'Independiente', color: '#4CAF50' },
  { value: 'necesita_ayuda', label: 'Necesita ayuda', color: '#FFC107' },
  { value: 'dependiente', label: 'Dependiente', color: '#F44336' },
];

interface NivelDificultadSelectorProps {
  value: NivelDificultad;
  onChange: (value: NivelDificultad) => void;
}

export function NivelDificultadSelector({
  value,
  onChange,
}: NivelDificultadSelectorProps) {
  return (
    <View style={styles.row}>
      {OPCIONES.map((opcion) => {
        const isSelected = value === opcion.value;
        return (
          <TouchableOpacity
            key={opcion.value}
            onPress={() => onChange(opcion.value)}
            style={[
              styles.option,
              isSelected && { backgroundColor: opcion.color, borderColor: opcion.color },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={opcion.label}
          >
            <View
              style={[styles.dot, { backgroundColor: isSelected ? Colors.ui.surface : opcion.color }]}
            />
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}
            >
              {opcion.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  option: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Spacing.radius.md,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.surface,
    gap: Spacing.xs,
    minHeight: 64,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  labelSelected: {
    color: Colors.text.onDark,
  },
});
