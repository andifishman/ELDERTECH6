//header reutilizable con título centrado, botón volver (izquierda) y botón escuchar (derecha)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { hablar } from '@/utils/tts';

interface AppHeaderProps {
  titulo: string;
  subtitulo?: string;
  mostrarVolver?: boolean;
  mostrarHablar?: boolean;
  textoHablar?: string;
  backgroundColor?: string;
  onVolver?: () => void;
  /** Si es true, el título se muestra más grande (para pantallas principales) */
  tituloGrande?: boolean;
}

//a partir de este largo el título ya no entra en una sola línea del header
const LARGO_UNA_LINEA = 14;

//devuelve el tamaño de fuente del título según su largo, sin bajar de lo legible
function calcularTamanioTitulo(titulo: string, grande: boolean): number {
  const base = grande ? 36 : 28;
  if (titulo.length <= LARGO_UNA_LINEA) return base;
  if (titulo.length <= 20) return grande ? 30 : 24;
  return grande ? 26 : 22;
}

export function AppHeader({
  titulo,
  subtitulo,
  mostrarVolver = false,
  mostrarHablar = true,
  textoHablar,
  backgroundColor = Colors.brand.greenDark,
  onVolver,
  tituloGrande = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  //los títulos largos ("Pedidos y Sugerencias") no entran en una línea:
  //bajamos un poco el tamaño y dejamos que use hasta dos líneas, así se lee entero
  const tamanioTitulo = calcularTamanioTitulo(titulo, tituloGrande);
  const lineasTitulo = titulo.length > LARGO_UNA_LINEA ? 2 : 1;

  //si hay handler propio lo usa, sino navega hacia atrás o a home
  function handleVolver() {
    if (onVolver) {
      onVolver();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/');
    }
  }

  //lee en voz alta el título + subtítulo, o el texto personalizado si se pasó
  function handleHablar() {
    const texto = textoHablar ?? `${titulo}. ${subtitulo ?? ''}`;
    hablar(texto);
  }

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top }]}>
      <View style={styles.row}>
        {/* Botón volver */}
        <View style={styles.sideContainer}>
          {mostrarVolver && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleVolver}
              accessibilityLabel="Volver"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={28} color={Colors.text.onDark} />
            </TouchableOpacity>
          )}
        </View>

        {/* Título central */}
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.titulo,
              tituloGrande && styles.tituloGrande,
              { fontSize: tamanioTitulo, lineHeight: Math.round(tamanioTitulo * 1.35) },
            ]}
            numberOfLines={lineasTitulo}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {titulo}
          </Text>
          {subtitulo ? (
            <Text style={styles.subtitulo} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
        </View>

        {/* Botón hablar */}
        <View style={styles.sideContainer}>
          {mostrarHablar && (
            <TouchableOpacity
              style={styles.speakButton}
              onPress={handleHablar}
              accessibilityLabel="Escuchar descripción de pantalla"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="volume-high" size={26} color={Colors.text.onDark} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
    paddingHorizontal: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  // Contenedor lateral justo para los botones, así el título gana ancho
  sideContainer: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Botón volver — más grande para adultos mayores
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.speak.onDarkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Botón escuchar — más grande para adultos mayores
  speakButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.speak.onDarkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  // Título más grande — accesible para adultos mayores
  titulo: {
    ...Typography.styles.screenTitle,
    fontSize: 28,
    fontWeight: 'bold' as const,
  },
  tituloGrande: {
    fontSize: 36,
    fontWeight: '600' as const,
  },
  subtitulo: {
    ...Typography.styles.screenSubtitle,
    marginTop: 1,
  },
});
