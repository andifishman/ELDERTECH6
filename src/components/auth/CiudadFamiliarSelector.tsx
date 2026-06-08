import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { CiudadFamiliar } from '@/types/auth.types';

const FLAG: Record<string, string> = {
  AR: '🇦🇷',
  IL: '🇮🇱',
  US: '🇺🇸',
};

interface CiudadFamiliarSelectorProps {
  ciudades: CiudadFamiliar[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function CiudadFamiliarSelector({
  ciudades,
  selected,
  onChange,
}: CiudadFamiliarSelectorProps) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((i) => i !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <View style={styles.list}>
      {ciudades.map((ciudad) => {
        const isSelected = selected.includes(ciudad.id);
        const flag = FLAG[ciudad.pais_codigo] ?? '🌍';
        return (
          <TouchableOpacity
            key={ciudad.id}
            onPress={() => toggle(ciudad.id)}
            style={[styles.row, isSelected && styles.rowSelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={ciudad.nombre}
          >
            <Text style={styles.flag}>{flag}</Text>
            <Text style={[styles.name, isSelected && styles.nameSelected]}>
              {ciudad.nombre}
            </Text>
            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color={Colors.ui.surface} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    gap: Spacing.md,
    minHeight: Spacing.touch.min,
  },
  rowSelected: {
    borderColor: Colors.brand.greenDark,
    backgroundColor: '#E8F5E9',
  },
  flag: {
    fontSize: Typography.size.xl,
  },
  name: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
  },
  nameSelected: {
    color: Colors.brand.greenDark,
    fontWeight: Typography.weight.semibold,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.brand.greenDark,
    borderColor: Colors.brand.greenDark,
  },
});
