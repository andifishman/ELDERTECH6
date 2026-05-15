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
}

export function AppHeader({
  titulo,
  subtitulo,
  mostrarVolver = false,
  mostrarHablar = true,
  textoHablar,
  backgroundColor = Colors.brand.greenDark,
  onVolver,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  function handleVolver() {
    if (onVolver) {
      onVolver();
    } else {
      router.back();
    }
  }

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
              <Ionicons name="arrow-back" size={24} color={Colors.text.onDark} />
            </TouchableOpacity>
          )}
        </View>

        {/* Título central */}
        <View style={styles.titleContainer}>
          <Text style={styles.titulo} numberOfLines={1}>
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
              <Ionicons name="volume-high" size={22} color={Colors.text.onDark} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Spacing.header,
  },
  sideContainer: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.speak.onDarkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  titulo: {
    ...Typography.styles.screenTitle,
  },
  subtitulo: {
    ...Typography.styles.screenSubtitle,
    marginTop: 1,
  },
});
