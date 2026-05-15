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

const OPCIONES = [
  {
    id: 'clima',
    emoji: '⛅',
    titulo: 'Clima',
    descripcion: 'Consultá el clima del día',
    ruta: '/mas/clima' as const,
    textoHablar: 'Clima. Consultá el clima del día.',
  },
  {
    id: 'radio',
    emoji: '📻',
    titulo: 'Radio',
    descripcion: 'Escuchá la radio',
    ruta: '/mas/radio' as const,
    textoHablar: 'Radio. Escuchá radios en vivo.',
  },
  {
    id: 'juegos',
    emoji: '🎲',
    titulo: 'Juegos',
    descripcion: 'Divertite con ElderTech',
    ruta: '/mas/juegos' as const,
    textoHablar: 'Juegos. Divertite con ElderTech.',
    proximamente: true,
  },
] as const;

export default function MasScreen() {
  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Más"
        subtitulo="Ver más opciones de la aplicación"
        mostrarVolver
        textoHablar="Más opciones: Clima, Radio y Juegos."
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {OPCIONES.map((opcion, index) => (
          <React.Fragment key={opcion.id}>
            <TouchableOpacity
              style={styles.opcionCard}
              onPress={() => !opcion.proximamente && router.push(opcion.ruta)}
              activeOpacity={opcion.proximamente ? 1 : 0.8}
              accessibilityLabel={opcion.titulo}
              accessibilityRole="button"
              accessibilityState={{ disabled: opcion.proximamente }}
            >
              <View style={styles.opcionLeft}>
                <View style={styles.emojiContainer}>
                  <Text style={styles.opcionEmoji}>{opcion.emoji}</Text>
                </View>
                <View style={styles.opcionInfo}>
                  <Text style={styles.opcionTitulo}>{opcion.titulo}</Text>
                  <Text style={styles.opcionDescripcion}>{opcion.descripcion}</Text>
                  {opcion.proximamente && (
                    <Text style={styles.proximamente}>Próximamente</Text>
                  )}
                </View>
              </View>
              <SpeakButton texto={opcion.textoHablar} size="sm" />
            </TouchableOpacity>

            {/* Separador rojo entre Clima y Radio */}
            {index === 0 && <View style={styles.separator} />}
          </React.Fragment>
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
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
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
    width: 52,
    height: 52,
    borderRadius: Spacing.radius.md,
    backgroundColor: Colors.ui.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionEmoji: {
    fontSize: 28,
  },
  opcionInfo: {
    flex: 1,
    gap: 3,
  },
  opcionTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  opcionDescripcion: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  proximamente: {
    fontSize: Typography.size.xs,
    color: Colors.text.hint,
    fontStyle: 'italic',
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
