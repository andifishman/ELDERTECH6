import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { SpeakButton } from '@/components/common/SpeakButton';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

interface OpcionMenu {
  id: string;
  emoji: string;
  titulo: string;
  descripcion: string;
  ruta: string;
  textoHablar: string;
  proximamente?: boolean;
}

// Opciones disponibles — aparecen arriba de la línea roja
const OPCIONES_ACTIVAS: OpcionMenu[] = [
  {
    id: 'clima',
    emoji: '⛅',
    titulo: 'Clima',
    descripcion: 'Consultá el clima del día',
    ruta: '/mas/clima',
    textoHablar: 'Clima. Consultá el clima del día.',
  },
  {
    id: 'radio',
    emoji: '📻',
    titulo: 'Radio',
    descripcion: 'Escuchá la radio',
    ruta: '/mas/radio',
    textoHablar: 'Radio. Escuchá radios en vivo.',
  },
];

// Opciones próximamente — aparecen abajo de la línea, bloqueadas y tachadas
const OPCIONES_PROXIMAMENTE: OpcionMenu[] = [
  {
    id: 'juegos',
    emoji: '🎲',
    titulo: 'Juegos',
    descripcion: 'Divertite con ElderTech',
    ruta: '/mas/juegos',
    textoHablar: 'Juegos. Divertite con ElderTech.',
    proximamente: true,
  },
];

export default function MasScreen() {
  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Más"
        mostrarVolver
        tituloGrande
        textoHablar="Más opciones: Clima, Radio y Juegos."
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Opciones disponibles ── */}
        {OPCIONES_ACTIVAS.map((opcion) => (
          <TouchableOpacity
            key={opcion.id}
            style={styles.opcionCard}
            onPress={() => router.push(opcion.ruta as any)}
            activeOpacity={0.8}
            accessibilityLabel={opcion.titulo}
            accessibilityRole="button"
          >
            <View style={styles.emojiContainer}>
              <Text style={styles.opcionEmoji}>{opcion.emoji}</Text>
            </View>
            <Text style={styles.opcionTitulo}>{opcion.titulo}</Text>
            <SpeakButton texto={opcion.textoHablar} size="lg" />
          </TouchableOpacity>
        ))}

        {/* ── Línea roja separadora ── */}
        <View style={styles.separator} />

        {/* ── Opciones próximamente — bloqueadas y tachadas ── */}
        {OPCIONES_PROXIMAMENTE.map((opcion) => (
          <View
            key={opcion.id}
            style={[styles.opcionCard, styles.opcionBloqueada]}
            accessibilityLabel={`${opcion.titulo} — próximamente`}
          >
            <View style={styles.opcionOverlay} pointerEvents="none" />
            <View style={[styles.emojiContainer, styles.emojiContainerBloqueado]}>
              <Text style={[styles.opcionEmoji, styles.opcionEmojiBloqueado]}>
                {opcion.emoji}
              </Text>
            </View>
            <View style={styles.opcionInfo}>
              <Text style={[styles.opcionTitulo, styles.textoBloqueado, styles.textoTachado]}>
                {opcion.titulo}
              </Text>
              <Text style={styles.proximamenteLabel}>🔒 Próximamente</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Botón Volver */}
      <TouchableOpacity
        style={styles.volverButton}
        onPress={() => router.back()}
        accessibilityLabel="Volver a la pantalla principal"
        accessibilityRole="button"
      >
        <Text style={styles.volverTexto}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screen.horizontal,
    paddingBottom: Spacing.lg,
  },
  opcionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  opcionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: Spacing.radius.md,
    backgroundColor: Colors.ui.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  opcionEmoji: {
    fontSize: 36,
  },
  opcionInfo: {
    flex: 1,
    gap: 4,
  },
  opcionTitulo: {
    flex: 1,
    fontSize: 26,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
  },
  opcionDescripcion: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  proximamenteLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.hint,
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Tarjeta bloqueada — fondo grisáceo
  opcionBloqueada: {
    opacity: 0.55,
    position: 'relative',
  },
  // Overlay encima de la tarjeta bloqueada
  opcionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200,200,200,0.15)',
    borderRadius: Spacing.radius.lg,
    zIndex: 1,
  },
  // Emoji desaturado en tarjeta bloqueada
  emojiContainerBloqueado: {
    backgroundColor: '#E0E0E0',
  },
  opcionEmojiBloqueado: {
    opacity: 0.5,
  },
  // Texto tachado
  textoTachado: {
    textDecorationLine: 'line-through',
  },
  textoBloqueado: {
    color: Colors.text.hint,
  },
  separator: {
    height: 3,
    backgroundColor: Colors.brand.red,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  volverButton: {
    backgroundColor: Colors.brand.greenDark,
    marginHorizontal: Spacing.screen.horizontal,
    marginBottom: Spacing.xxl,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  volverTexto: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
});
