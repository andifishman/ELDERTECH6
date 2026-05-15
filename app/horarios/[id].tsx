import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { SpeakButton } from '@/components/common/SpeakButton';
import { LoadingState, ErrorState } from '@/components/common/LoadingState';
import { useActividad } from '@/hooks/useActividades';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { formatHora, esMañana } from '@/utils/dateUtils';

export default function ActividadDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: actividad, isLoading, error } = useActividad(id ?? null);

  if (isLoading) return <LoadingState mensaje="Cargando actividad..." />;
  if (error || !actividad) return <ErrorState mensaje="No se encontró la actividad." />;

  const mañana = esMañana(actividad.hora_inicio);
  const colorAccent = mañana ? Colors.activity.morning : Colors.activity.afternoon;
  const emoji = actividad.emoji_icono ?? actividad.tipo_actividad?.emoji ?? '📋';
  const horaTexto = `${formatHora(actividad.hora_inicio)}${actividad.hora_fin ? ` - ${formatHora(actividad.hora_fin)}` : ''} hs`;

  const textoHablar = [
    actividad.nombre,
    `Horario: ${horaTexto}.`,
    actividad.ubicacion ? `Lugar: ${actividad.ubicacion.nombre}. ${actividad.ubicacion.descripcion ?? ''}` : '',
    actividad.descripcion ?? '',
    actividad.responsable
      ? `Responsable: ${actividad.responsable.nombre} ${actividad.responsable.apellido}.`
      : '',
  ].filter(Boolean).join(' ');

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Horarios del Día"
        mostrarVolver
        textoHablar={textoHablar}
        backgroundColor={Colors.brand.greenDark}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero de actividad */}
        <View style={styles.hero}>
          <View style={[styles.emojiCircle, { backgroundColor: `${colorAccent}22` }]}>
            <Text style={styles.heroEmoji}>{emoji}</Text>
          </View>
          <Text style={styles.heroNombre}>{actividad.nombre}</Text>
          <Text style={styles.heroHora}>⏰ {horaTexto}</Text>
        </View>

        {/* Ubicación */}
        {actividad.ubicacion && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📍</Text>
              <Text style={styles.sectionTitle}>¿Dónde es?</Text>
              <SpeakButton
                texto={`${actividad.ubicacion.nombre}. ${actividad.ubicacion.descripcion ?? ''}`}
                size="sm"
              />
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionMainText}>{actividad.ubicacion.nombre}</Text>
              {actividad.ubicacion.descripcion ? (
                <Text style={styles.sectionSubText}>{actividad.ubicacion.descripcion}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Descripción */}
        {actividad.descripcion && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📝</Text>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <SpeakButton texto={actividad.descripcion} size="sm" />
            </View>
            <Text style={styles.descripcionTexto}>{actividad.descripcion}</Text>
          </View>
        )}

        {/* Responsable */}
        {actividad.responsable && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🏅</Text>
              <Text style={styles.sectionTitle}>
                {`${actividad.responsable.nombre} ${actividad.responsable.apellido}`}
              </Text>
              <SpeakButton
                texto={`Responsable: ${actividad.responsable.nombre} ${actividad.responsable.apellido}`}
                size="sm"
              />
            </View>
            <Text style={styles.sectionSubText}>Instructor ElderTech</Text>
          </View>
        )}
      </ScrollView>
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
    gap: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  hero: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  emojiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 44,
  },
  heroNombre: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  heroHora: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },
  section: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  sectionCard: {
    backgroundColor: Colors.ui.background,
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  sectionMainText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  sectionSubText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  descripcionTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    lineHeight: 26,
  },
});
