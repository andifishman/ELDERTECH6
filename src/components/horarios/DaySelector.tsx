import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
      <View style={styles.row}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  dayItem: {
    flex: 1,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroBgActivo: {
    backgroundColor: Colors.brand.red,
  },
  numeroDia: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  numeroDiaActivo: {
    color: Colors.text.onDark,
    fontWeight: Typography.weight.bold,
  },
});
