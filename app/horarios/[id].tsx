import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { LoadingState, ErrorState } from '@/components/common/LoadingState';
import { useActividad } from '@/hooks/useActividades';
import { hablar } from '@/utils/tts';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { formatHora, esMañana, parseHora } from '@/utils/dateUtils';

export default function ActividadDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: actividad, isLoading, error } = useActividad(id ?? null);

  // Estado reactivo — se actualiza cada 30s para reflejar el minuto actual
  const [minutosRestantes, setMinutosRestantes] = useState(0);

  useEffect(() => {
    if (!actividad) return;
    const calcular = () => {
      const ahora = new Date();
      const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
      const { horas: hIni, minutos: mIni } = parseHora(actividad.hora_inicio);
      return hIni * 60 + mIni - minutosAhora;
    };
    setMinutosRestantes(calcular());
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const now = new Date();
    const msHastaProximoMinuto = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeoutId = setTimeout(() => {
      setMinutosRestantes(calcular());
      intervalId = setInterval(() => setMinutosRestantes(calcular()), 60_000);
    }, msHastaProximoMinuto);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [actividad?.hora_inicio]);

  if (isLoading) return <LoadingState mensaje="Cargando actividad..." />;
  if (error || !actividad) return <ErrorState mensaje="No se encontró la actividad." />;

  const mañana = esMañana(actividad.hora_inicio);
  const colorAccent = mañana ? Colors.activity.morning : Colors.activity.afternoon;
  const emoji = actividad.emoji_icono ?? actividad.tipo_actividad?.emoji ?? '📋';
  const horaTexto = `${formatHora(actividad.hora_inicio)}${actividad.hora_fin ? ` - ${formatHora(actividad.hora_fin)}` : ''} hs`;
  const esPronto = minutosRestantes > 0 && minutosRestantes <= 30;

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
          {esPronto && (
            <View style={styles.prontoBadge}>
              <Text style={styles.prontoTexto}>Empieza en {minutosRestantes} minutos</Text>
            </View>
          )}
        </View>

        {/* Ubicación */}
        {actividad.ubicacion && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📍</Text>
              <Text style={styles.sectionTitle}>¿Dónde es?</Text>
              <TouchableOpacity
                style={styles.escucharBtn}
                onPress={() => hablar(`${actividad.ubicacion!.nombre}. ${actividad.ubicacion!.descripcion ?? ''}`)}
                accessibilityLabel="Escuchar ubicación"
                accessibilityRole="button"
              >
                <Ionicons name="volume-medium-outline" size={18} color="#3D5AFE" />
                <Text style={styles.escucharBtnTexto}>Escuchar</Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.escucharBtn}
                onPress={() => hablar(actividad.descripcion!)}
                accessibilityLabel="Escuchar descripción"
                accessibilityRole="button"
              >
                <Ionicons name="volume-medium-outline" size={18} color="#3D5AFE" />
                <Text style={styles.escucharBtnTexto}>Escuchar</Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.escucharBtn}
                onPress={() => hablar(`Responsable: ${actividad.responsable!.nombre} ${actividad.responsable!.apellido}`)}
                accessibilityLabel="Escuchar responsable"
                accessibilityRole="button"
              >
                <Ionicons name="volume-medium-outline" size={18} color="#3D5AFE" />
                <Text style={styles.escucharBtnTexto}>Escuchar</Text>
              </TouchableOpacity>
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

  prontoBadge: {
    backgroundColor: '#FF8F00',
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 12,
    alignSelf: 'stretch',
  },
  prontoTexto: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.heavy,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Botón Escuchar — rectangular redondeado, fondo gris claro, texto azul
  escucharBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.ui.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  escucharBtnTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: '#3D5AFE',
  },
});
