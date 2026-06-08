import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { Interes } from '@/types/auth.types';

interface InterestSelectorProps {
  intereses: Interes[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function InterestSelector({
  intereses,
  selected,
  onChange,
}: InterestSelectorProps) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((i) => i !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <View style={styles.grid}>
      {intereses.map((interes) => {
        const isSelected = selected.includes(interes.id);
        return (
          <TouchableOpacity
            key={interes.id}
            onPress={() => toggle(interes.id)}
            style={[styles.chip, isSelected && styles.chipSelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={interes.nombre}
          >
            {interes.emoji && (
              <Text style={styles.emoji}>{interes.emoji}</Text>
            )}
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {interes.nombre}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color={Colors.ui.surface} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Spacing.radius.full,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.surface,
    gap: Spacing.xs,
    minHeight: Spacing.touch.min,
  },
  chipSelected: {
    backgroundColor: Colors.brand.greenDark,
    borderColor: Colors.brand.greenDark,
  },
  emoji: {
    fontSize: Typography.size.md,
  },
  label: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
  },
  labelSelected: {
    color: Colors.text.onDark,
  },
});
