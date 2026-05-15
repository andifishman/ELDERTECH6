import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { SpeakRow } from '@/components/common/SpeakButton';

interface HomeCardProps {
  label: string;
  subtitulo?: string;
  emoji: string;
  backgroundColor: string;
  textoHablar: string;
  onPress: () => void;
}

export function HomeCard({
  label,
  subtitulo,
  emoji,
  backgroundColor,
  textoHablar,
  onPress,
}: HomeCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      {subtitulo ? (
        <Text style={styles.subtitulo}>{subtitulo}</Text>
      ) : null}
      <View style={styles.speakWrapper}>
        <SpeakRow texto={textoHablar} onDark />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // Ocupa mitad del ancho menos el gap
    width: '48%',
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 180,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  emojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },
  subtitulo: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.regular,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    flex: 1,
  },
  speakWrapper: {
    marginTop: Spacing.xs,
  },
});
