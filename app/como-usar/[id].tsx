// "¿Cómo usar?" — pantalla de detalle de una sección: explicación completa,
// paso a paso, con letra grande. Se llega acá al tocar un botón de la grilla
// de /como-usar. Si la sección tiene subsecciones (solo "Más"), se muestran
// todas seguidas, cada una con su propio título y sus propios pasos.
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { buscarSeccion, textoCompletoSeccion, type SeccionGuia } from '@/constants/comoUsarContenido';

/** Bloque de contenido de una sección: intro, pasos numerados y tip — se reutiliza
 * tanto para la sección principal como para cada subsección de "Más". */
function BloqueContenido({ seccion, chico = false }: { seccion: SeccionGuia; chico?: boolean }) {
  return (
    <View>
      <View style={styles.bloqueTituloFila}>
        <View style={[styles.emojiCirculo, chico && styles.emojiCirculoChico, { backgroundColor: seccion.color }]}>
          <Text style={chico ? styles.emojiChico : styles.emoji}>{seccion.emoji}</Text>
        </View>
        <Text style={chico ? styles.bloqueTituloChico : styles.bloqueTitulo}>{seccion.titulo}</Text>
      </View>

      <Text style={styles.intro}>{seccion.intro}</Text>

      {seccion.pasos.map((paso, i) => (
        <View key={i} style={styles.pasoFila}>
          <View style={[styles.pasoNumero, { backgroundColor: seccion.color }]}>
            <Text style={styles.pasoNumeroTexto}>{i + 1}</Text>
          </View>
          <Text style={styles.pasoTexto}>{paso}</Text>
        </View>
      ))}

      {seccion.tip && (
        <View style={styles.tipCaja}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={styles.tipTexto}>{seccion.tip}</Text>
        </View>
      )}
    </View>
  );
}

export default function ComoUsarDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const seccion = buscarSeccion(id);

  if (!seccion) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="¿Cómo usar?" mostrarVolver backgroundColor="#4CAF50" />
        <View style={styles.noEncontrado}>
          <Text style={styles.noEncontradoTexto}>No se encontró esta sección de la guía.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        titulo={seccion.titulo}
        mostrarVolver
        backgroundColor={seccion.color}
        textoHablar={textoCompletoSeccion(seccion)}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <BloqueContenido seccion={seccion} />

        {seccion.subsecciones && (
          <View style={styles.subLista}>
            {seccion.subsecciones.map((sub) => (
              <View key={sub.id} style={[styles.subBloque, { borderLeftColor: sub.color }]}>
                <BloqueContenido seccion={sub} chico />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  scroll: { padding: Spacing.screen.horizontal, gap: Spacing.lg },

  bloqueTituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  emojiCirculo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiCirculoChico: { width: 44, height: 44, borderRadius: 22 },
  emoji: { fontSize: 26 },
  emojiChico: { fontSize: 22 },
  bloqueTitulo: {
    flex: 1,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  bloqueTituloChico: {
    flex: 1,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },

  intro: {
    fontSize: Typography.size.lg,
    lineHeight: 28,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
    marginBottom: Spacing.md,
  },

  pasoFila: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pasoNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  pasoNumeroTexto: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  pasoTexto: {
    flex: 1,
    fontSize: Typography.size.lg,
    lineHeight: 28,
    color: Colors.text.primary,
  },

  tipCaja: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.tutoriales.amberBg,
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  tipEmoji: { fontSize: 20 },
  tipTexto: {
    flex: 1,
    fontSize: Typography.size.md,
    lineHeight: 24,
    color: Colors.tutoriales.amber,
    fontWeight: Typography.weight.medium,
  },

  subLista: { gap: Spacing.lg, marginTop: Spacing.sm },
  subBloque: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    borderLeftWidth: 6,
    padding: Spacing.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  noEncontrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  noEncontradoTexto: { fontSize: Typography.size.lg, color: Colors.text.secondary, textAlign: 'center' },
});
