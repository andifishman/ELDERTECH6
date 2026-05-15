import React, { useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { DaySelector } from '@/components/horarios/DaySelector';
import { ActividadCard } from '@/components/horarios/ActividadCard';
import { LoadingState, ErrorState } from '@/components/common/LoadingState';
import { useActividades } from '@/hooks/useActividades';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { getVentanaDias, formatFechaLarga, esMismodia } from '@/utils/dateUtils';
import type { ActividadCompleta } from '@/types/database.types';

export default function HorariosScreen() {
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date());
  const ventana = getVentanaDias(new Date());

  const { data: actividades, isLoading, error, refetch } = useActividades(diaSeleccionado);

  const fechaLarga = formatFechaLarga(diaSeleccionado);

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Horarios del Día"
        mostrarVolver
        textoHablar={`Horarios del Día. ${fechaLarga}`}
        backgroundColor={Colors.brand.red}
      />

      {/* Selector de día y fecha */}
      <View style={styles.fechaHeader}>
        <View style={styles.fechaRow}>
          <Text style={styles.fechaEmoji}>📅</Text>
          <Text style={styles.fechaTexto}>{fechaLarga}</Text>
        </View>
      </View>

      <DaySelector
        semana={ventana}
        diaSeleccionado={diaSeleccionado}
        onSeleccionar={setDiaSeleccionado}
      />

      {/* Lista de actividades */}
      <View style={styles.listaContainer}>
        {isLoading ? (
          <LoadingState mensaje="Cargando actividades..." />
        ) : error ? (
          <ErrorState
            mensaje={error instanceof Error ? error.message : 'No se pudieron cargar las actividades.'}
            onReintentar={refetch}
          />
        ) : !actividades?.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTexto}>
              No hay actividades para este día.
            </Text>
          </View>
        ) : (
          <FlatList
            data={actividades}
            keyExtractor={(item) => item.id}
            renderItem={({ item }: { item: ActividadCompleta }) => (
              <ActividadCard
                actividad={item}
                onPress={() => router.push(`/horarios/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.listaContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  fechaHeader: {
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fechaEmoji: {
    fontSize: 20,
  },
  fechaTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  listaContainer: {
    flex: 1,
  },
  listaContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTexto: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },
});
