// Agenda — detalle de un recordatorio: ver, cambiar estado, editar o eliminar
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useAgendaDetalle, useCambiarEstadoRecordatorio, useEliminarRecordatorio } from '@/hooks/useAgenda';
import type { EstadoRecordatorio } from '@/services/agendaService';
import { formatearFechaLegible } from '@/utils/agendaDateUtils';

const ESTADO_LABEL: Record<EstadoRecordatorio, string> = {
  pendiente: 'Pendiente',
  realizado: 'Realizado',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};
const ESTADO_COLOR: Record<EstadoRecordatorio, { bg: string; color: string }> = {
  pendiente: { bg: '#E3F2FD', color: '#0D47A1' },
  realizado: { bg: '#E8F5E9', color: '#1B5E3B' },
  vencido: { bg: '#FFEBEE', color: '#C62828' },
  cancelado: { bg: '#F5F5F5', color: '#757575' },
};

export default function DetalleRecordatorioScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recordatorio, isLoading } = useAgendaDetalle(id ?? null);
  const cambiarEstado = useCambiarEstadoRecordatorio();
  const eliminar = useEliminarRecordatorio();

  const cambiar = useCallback(
    (estado: 'pendiente' | 'realizado' | 'cancelado') => {
      if (!id) return;
      cambiarEstado.mutate({ id, estado });
    },
    [id, cambiarEstado],
  );

  const confirmarEliminar = useCallback(() => {
    if (!id) return;
    Alert.alert(
      'Eliminar recordatorio',
      '¿Seguro que querés eliminar este recordatorio? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminar.mutateAsync(id);
              router.replace('/agenda');
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'No se pudo eliminar el recordatorio.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }, [id, eliminar]);

  if (isLoading || !recordatorio) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Recordatorio" mostrarVolver backgroundColor={Colors.agenda.accent} />
        <View style={styles.cargandoContainer}>
          <ActivityIndicator size="large" color={Colors.agenda.accent} />
          <Text style={styles.cargandoTexto}>Cargando recordatorio...</Text>
        </View>
      </View>
    );
  }

  const estadoInfo = ESTADO_COLOR[recordatorio.estado];

  return (
    <View style={styles.root}>
      <AppHeader
        titulo={recordatorio.titulo}
        mostrarVolver
        backgroundColor={Colors.agenda.accent}
        textoHablar={`${recordatorio.titulo}. ${formatearFechaLegible(recordatorio.fecha)} a las ${recordatorio.hora.slice(0, 5)}. Estado: ${ESTADO_LABEL[recordatorio.estado]}.`}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconoWrap}>
              <Ionicons name="alarm-outline" size={28} color={Colors.agenda.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fechaTexto}>{formatearFechaLegible(recordatorio.fecha)}</Text>
              <Text style={styles.horaTexto}>{recordatorio.hora.slice(0, 5)}</Text>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: estadoInfo.bg }]}>
              <Text style={[styles.estadoBadgeTexto, { color: estadoInfo.color }]}>{ESTADO_LABEL[recordatorio.estado]}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="notifications-outline" size={18} color={Colors.text.hint} />
            <Text style={styles.metaTexto}>Aviso 30 minutos antes</Text>
          </View>
        </View>

        {/* Acciones de estado */}
        {recordatorio.estado !== 'realizado' && recordatorio.estado !== 'cancelado' && (
          <TouchableOpacity style={styles.accionPrimaria} onPress={() => cambiar('realizado')} disabled={cambiarEstado.isPending}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.text.onDark} />
            <Text style={styles.accionPrimariaTexto}>Marcar como realizado</Text>
          </TouchableOpacity>
        )}
        {(recordatorio.estado === 'realizado' || recordatorio.estado === 'cancelado') && (
          <TouchableOpacity style={styles.accionSecundaria} onPress={() => cambiar('pendiente')} disabled={cambiarEstado.isPending}>
            <Ionicons name="arrow-undo" size={22} color={Colors.agenda.accentDark} />
            <Text style={styles.accionSecundariaTexto}>Volver a pendiente</Text>
          </TouchableOpacity>
        )}
        {recordatorio.estado === 'pendiente' && (
          <TouchableOpacity style={styles.accionSecundaria} onPress={() => cambiar('cancelado')} disabled={cambiarEstado.isPending}>
            <Ionicons name="close-circle-outline" size={22} color={Colors.text.secondary} />
            <Text style={styles.accionSecundariaTexto}>Cancelar recordatorio</Text>
          </TouchableOpacity>
        )}

        <View style={styles.accionesRow}>
          <TouchableOpacity style={styles.editarBtn} onPress={() => router.push(`/agenda/nuevo?editId=${recordatorio.id}` as never)}>
            <Ionicons name="pencil" size={20} color={Colors.agenda.accentDark} />
            <Text style={styles.editarTexto}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.eliminarBtn} onPress={confirmarEliminar} disabled={eliminar.isPending}>
            <Ionicons name="trash" size={20} color={Colors.brand.red} />
            <Text style={styles.eliminarTexto}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  cargandoContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  cargandoTexto: { fontSize: Typography.size.md, color: Colors.text.secondary, fontWeight: Typography.weight.semibold },
  scroll: { padding: Spacing.screen.horizontal, gap: Spacing.md },

  card: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconoWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: `${Colors.agenda.accent}22` },
  fechaTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  horaTexto: { fontSize: Typography.size.sm, color: Colors.text.hint },
  estadoBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Spacing.radius.full },
  estadoBadgeTexto: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaTexto: { fontSize: Typography.size.sm, color: Colors.text.hint },

  accionPrimaria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.greenDark,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
  },
  accionPrimariaTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  accionSecundaria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.md,
    minHeight: Spacing.touch.comfortable,
    backgroundColor: Colors.ui.surface,
  },
  accionSecundariaTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.secondary },

  accionesRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  editarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.agenda.accent,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.md,
    minHeight: Spacing.touch.comfortable,
  },
  editarTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.agenda.accentDark },
  eliminarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.brand.red,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.md,
    minHeight: Spacing.touch.comfortable,
  },
  eliminarTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.brand.red },
});
