import React from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { RadioCard } from '@/components/radio/RadioCard';
import { NowPlayingBar } from '@/components/radio/NowPlayingBar';
import { LoadingState, ErrorState } from '@/components/common/LoadingState';
import { useRadios } from '@/hooks/useRadio';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { RadioGroup, RadioStation } from '@/types/radio.types';

export default function RadioScreen() {
  const { data: grupos, isLoading, error, refetch } = useRadios();

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Radio" subtitulo="Escuchá radios en vivo" mostrarVolver />
        <LoadingState mensaje="Cargando radios..." />
      </View>
    );
  }

  if (error || !grupos) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Radio" subtitulo="Escuchá radios en vivo" mostrarVolver />
        <ErrorState mensaje="No se pudieron cargar las radios." onReintentar={refetch} />
      </View>
    );
  }

  const sections = grupos.map((grupo: RadioGroup) => ({
    title: grupo.paisLabel,
    pais: grupo.pais,
    data: grupo.radios,
  }));

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Radio"
        subtitulo="Escuchá radios en vivo"
        mostrarVolver
        textoHablar="Radio. Tocá una radio para escucharla en vivo."
      />

      {/* Instrucción */}
      <View style={styles.instruccionBar}>
        <Ionicons name="headset-outline" size={18} color={Colors.text.secondary} />
        <Text style={styles.instruccionTexto}>Tocá una radio para escuchar</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item: RadioStation) => item.id}
        renderItem={({ item }: { item: RadioStation }) => <RadioCard radio={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionPais}>{section.pais}</Text>
            <Text style={styles.sectionLabel}>{section.title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      <NowPlayingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  instruccionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  instruccionTexto: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  listContent: {
    paddingTop: Spacing.lg,
    paddingBottom: 100, // espacio para NowPlayingBar
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.md,
  },
  sectionPais: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.hint,
    backgroundColor: Colors.ui.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionLabel: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
});
