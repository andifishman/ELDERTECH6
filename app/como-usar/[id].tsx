// "¿Cómo usar?" — pantalla de detalle de una sección: explicación completa,
// paso a paso, con letra grande. Se llega acá al tocar un botón de la grilla
// de /como-usar. Si la sección tiene subsecciones (ej: "Más" o "Juegos"), en
// vez de mostrar el contenido de todas se muestra una grilla de cuadrados
// para elegir cuál ver — igual que la grilla principal de /como-usar.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { buscarSeccion, textoCompletoSeccion, type SeccionGuia } from '@/constants/comoUsarContenido';

/** Bloque de contenido de una sección: intro, pasos numerados y tip */
function BloqueContenido({ seccion }: { seccion: SeccionGuia }) {
  return (
    <View>
      <View style={styles.bloqueTituloFila}>
        <View style={[styles.emojiCirculo, { backgroundColor: seccion.color }]}>
          <Text style={styles.emoji}>{seccion.emoji}</Text>
        </View>
        <Text style={styles.bloqueTitulo}>{seccion.titulo}</Text>
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
  const router = useRouter();
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
          <View style={styles.grid}>
            {seccion.subsecciones.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={[styles.item, { backgroundColor: sub.color }]}
                onPress={() => router.push({ pathname: '/como-usar/[id]', params: { id: sub.id } } as any)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${sub.titulo}. Tocá para ver cómo se usa`}
              >
                <Text style={styles.itemEmoji}>{sub.emoji}</Text>
                {/* Alto fijo + centrado propio: en Android, Text con adjustsFontSizeToFit
                    a veces reserva el alto de las 2 líneas permitidas aunque el texto entre
                    en una sola, y lo dibuja pegado arriba de esa caja — visualmente el texto
                    queda "bajo" respecto del emoji. Centrarlo en un wrapper de alto fijo evita
                    depender de cómo cada plataforma alinee el texto dentro de su propia caja. */}
                <View style={styles.itemTextoWrap}>
                  <Text style={styles.itemTexto} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {sub.tituloBoton ?? sub.titulo}
                  </Text>
                </View>
              </TouchableOpacity>
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
  emoji: { fontSize: 26 },
  bloqueTitulo: {
    flex: 1,
    fontSize: Typography.size.xl,
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

  // Grilla de cuadrados para las subsecciones (ej: Clima/Radio/Juegos/Sugerencias
  // dentro de "Más", o cada juego dentro de "Juegos") — usa flexWrap en vez del
  // reparto fijo en 4 filas de la grilla principal, porque acá la cantidad de
  // ítems varía según la sección (4, 7, etc).
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  item: {
    width: '47%',
    aspectRatio: 1, // antes 1.3 — ~30% más alto a pedido del usuario
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  itemEmoji: { fontSize: 32 },
  itemTextoWrap: {
    minHeight: 44, // 2 líneas de itemTexto (lineHeight 22) — reserva alto fijo, ver comentario arriba
    justifyContent: 'center',
  },
  itemTexto: {
    fontSize: Typography.size.md,
    lineHeight: 22,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
  },

  noEncontrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  noEncontradoTexto: { fontSize: Typography.size.lg, color: Colors.text.secondary, textAlign: 'center' },
});
