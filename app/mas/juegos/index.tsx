import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

const JUEGOS = [
  {
    id: 'ahorcado',
    emoji: '🪢',
    titulo: 'Ahorcado',
    descripcion: 'Adiviná la palabra letra por letra',
    color: '#1B5E3B',
  },
  {
    id: 'memotest',
    emoji: '🃏',
    titulo: 'Memotest',
    descripcion: 'Encontrá los pares de cartas iguales',
    color: '#1565C0',
  },
  {
    id: 'simon',
    emoji: '🎮',
    titulo: 'Simón',
    descripcion: 'Repetí la secuencia de colores',
    color: '#6A1B9A',
  },
  {
    id: 'conexiones',
    emoji: '🔗',
    titulo: 'Conexiones',
    descripcion: 'Agrupá las palabras por categoría',
    color: '#E65100',
  },
  {
    id: 'laberinto',
    emoji: '🌀',
    titulo: 'Laberinto',
    descripcion: 'Encontrá la salida del laberinto',
    color: '#00796B',
  },
  {
    id: 'sopa',
    emoji: '🔤',
    titulo: 'Sopa de Letras',
    descripcion: 'Encontrá las palabras escondidas',
    color: '#F57F17',
  },
];

export default function JuegosScreen() {
  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Juegos"
        subtitulo="Elegí un juego para jugar"
        mostrarVolver
        textoHablar="Juegos. Ahorcado, Memotest, Simón, Conexiones, Laberinto y Sopa de Letras."
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {JUEGOS.map((juego) => (
          <TouchableOpacity
            key={juego.id}
            style={styles.card}
            onPress={() => router.push(`/mas/juegos/${juego.id}` as never)}
            activeOpacity={0.82}
            accessibilityLabel={`Jugar ${juego.titulo}: ${juego.descripcion}`}
            accessibilityRole="button"
          >
            <View style={[styles.emojiContainer, { backgroundColor: juego.color }]}>
              <Text style={styles.emoji}>{juego.emoji}</Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.titulo}>{juego.titulo}</Text>
              <Text style={styles.descripcion}>{juego.descripcion}</Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.screen.horizontal,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: Spacing.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 32 },
  info: { flex: 1 },
  titulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  descripcion: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 3,
    lineHeight: 20,
  },
  arrow: {
    fontSize: 32,
    color: Colors.text.hint,
    fontWeight: '300',
    marginRight: 4,
  },
});
