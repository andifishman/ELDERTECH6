import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { getDiaLetra, esMismodia } from '@/utils/dateUtils';

interface DaySelectorProps {
  semana: Date[];
  diaSeleccionado: Date;
  onSeleccionar: (dia: Date) => void;
}

export function DaySelector({ semana, diaSeleccionado, onSeleccionar }: DaySelectorProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {semana.map((dia) => {
          const activo = esMismodia(dia, diaSeleccionado);
          return (
            <TouchableOpacity
              key={dia.toISOString()}
              style={styles.dayItem}
              onPress={() => onSeleccionar(dia)}
              accessibilityLabel={`Día ${dia.getDate()}`}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Text style={[styles.letraDia, activo && styles.letraDiaActiva]}>
                {getDiaLetra(dia)}
              </Text>
              <View style={[styles.numeroBg, activo && styles.numeroBgActivo]}>
                <Text style={[styles.numeroDia, activo && styles.numeroDiaActivo]}>
                  {dia.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  dayItem: {
    width: 40,
    alignItems: 'center',
    gap: 4,
  },
  letraDia: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text.secondary,
  },
  letraDiaActiva: {
    color: Colors.brand.red,
    fontWeight: Typography.weight.bold,
  },
  numeroBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroBgActivo: {
    backgroundColor: Colors.brand.red,
  },
  numeroDia: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  numeroDiaActivo: {
    color: Colors.text.onDark,
    fontWeight: Typography.weight.bold,
  },
});
