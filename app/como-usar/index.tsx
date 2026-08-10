// "¿Cómo usar?" — grilla de 8 botones grandes y coloridos (los mismos colores
// que sus tarjetas en la Home), 2 de ancho por 4 de alto. Todo el layout es
// flexible (sin ScrollView): las 4 filas se reparten el alto disponible de la
// pantalla, así entran todas sin tener que deslizar. Tocar un botón lleva a
// una pantalla aparte con la explicación detallada de esa sección.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { TODAS_LAS_SECCIONES, type SeccionGuia } from '@/constants/comoUsarContenido';

// Agrupa las 8 secciones en filas de a 2 — se arma una sola vez, no en cada render.
const FILAS: SeccionGuia[][] = [];
for (let i = 0; i < TODAS_LAS_SECCIONES.length; i += 2) {
  FILAS.push(TODAS_LAS_SECCIONES.slice(i, i + 2));
}

export default function ComoUsarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="¿Cómo usar?"
        subtitulo="Guía simple de toda la aplicación"
        mostrarVolver
        backgroundColor="#4CAF50"
        textoHablar="Cómo usar ElderTech. Tocá el botón de la parte que querés aprender a usar."
      />

      <View style={[styles.contenido, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Text style={styles.instruccion}>
          Tocá el botón de la parte que querés aprender a usar
        </Text>

        <View style={styles.grid}>
          {FILAS.map((fila, i) => (
            <View key={i} style={styles.fila}>
              {fila.map((seccion) => (
                <TouchableOpacity
                  key={seccion.id}
                  style={[styles.item, { backgroundColor: seccion.color }]}
                  onPress={() => router.push({ pathname: '/como-usar/[id]', params: { id: seccion.id } } as any)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${seccion.titulo}. Tocá para ver cómo se usa`}
                >
                  <Text style={styles.itemEmoji}>{seccion.emoji}</Text>
                  <Text style={styles.itemTexto} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {seccion.tituloBoton ?? seccion.titulo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  contenido: {
    flex: 1,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.md,
  },
  instruccion: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.md,
  },
  // Ocupa todo el alto que queda debajo de la instrucción, repartido en 4 filas iguales.
  grid: { flex: 1, gap: Spacing.sm },
  fila: { flex: 1, flexDirection: 'row', gap: Spacing.sm },
  item: {
    flex: 1,
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
  // translateY sube solo el texto un poco, sin mover el emoji (que queda
  // centrado por el `gap` del contenedor) — así el texto queda a la misma
  // distancia del emoji arriba que del borde inferior del cuadrado.
  itemTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
    transform: [{ translateY: -6 }],
  },
});
