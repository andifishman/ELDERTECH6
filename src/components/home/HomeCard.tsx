import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { SpeakRow } from '@/components/common/SpeakButton';

interface HomeCardProps {
  label: string;
  emoji: string;
  backgroundColor: string;
  textoHablar: string;
  onPress: () => void;
  variant?: 'large' | 'small';
}

export function HomeCard({
  label,
  emoji,
  backgroundColor,
  textoHablar,
  onPress,
  variant = 'small',
}: HomeCardProps) {
  if (variant === 'large') {
    return (
      <TouchableOpacity
        style={[styles.largeCard, { backgroundColor }]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Text style={styles.largeEmoji}>{emoji}</Text>
        <Text style={styles.largeLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.smallCard, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={styles.smallEmoji}>{emoji}</Text>
      <Text style={styles.smallLabel}>{label}</Text>
      <SpeakRow texto={textoHablar} onDark />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  largeCard: {
    width: '100%',
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  largeEmoji: {
    fontSize: 52,
  },
  largeLabel: {
    ...Typography.styles.cardTitle,
  },
  smallCard: {
    flex: 1,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 140,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  smallEmoji: {
    fontSize: 36,
  },
  smallLabel: {
    ...Typography.styles.cardTitleSmall,
  },
});
