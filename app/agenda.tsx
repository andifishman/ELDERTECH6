// Agenda personal — pantalla placeholder, la funcionalidad todavía no está implementada
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export default function AgendaScreen() {
  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Agenda"
        mostrarVolver
        textoHablar="Agenda. Muy pronto vas a poder ver tu agenda personal acá."
      />
      <View style={styles.content}>
        <Text style={styles.emoji}>🗒️</Text>
        <Text style={styles.titulo}>¡Muy pronto!</Text>
        <Text style={styles.texto}>
          Estamos preparando tu agenda personal. Todavía no está lista, pero vas a poder verla acá apenas esté disponible.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.md,
  },
  emoji: { fontSize: 64 },
  titulo: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  texto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
