// Agenda — detalle de un recordatorio: ver, escuchar audio, cambiar estado, editar o eliminar
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
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
const RECURRENCIA_LABEL: Record<string, string> = {
  ninguna: 'No se repite',
  diaria: 'Se repite todos los días',
  laborables: 'Se repite de lunes a viernes',
  semanal: 'Se repite todas las semanas',
  mensual: 'Se repite todos los meses',
  anual: 'Se repite todos los años',
  personalizada: 'Se repite en días personalizados',
};
const NOTIFICACION_LABEL: Record<number, string> = {
  0: 'En el momento',
  10: '10 minutos antes',
  30: '30 minutos antes',
  60: '1 hora antes',
  1440: '1 día antes',
};

function formatearDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DetalleRecordatorioScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recordatorio, isLoading } = useAgendaDetalle(id ?? null);
  const cambiarEstado = useCambiarEstadoRecordatorio();
  const eliminar = useEliminarRecordatorio();

  const [reproduciendo, setReproduciendo] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const reproducirAudio = useCallback(async () => {
    if (!recordatorio?.audio_url) return;
    try {
      if (reproduciendo) {
        await soundRef.current?.stopAsync().catch(() => {});
        setReproduciendo(false);
        return;
      }
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: recordatorio.audio_url }, { shouldPlay: true });
      soundRef.current = sound;
      setReproduciendo(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setReproduciendo(false);
      });
    } catch (err) {
      console.warn('[Agenda] Error al reproducir:', err);
    }
  }, [recordatorio, reproduciendo]);

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

  const color = recordatorio.color || Colors.agenda.prioridad[recordatorio.prioridad];
  const estadoInfo = ESTADO_COLOR[recordatorio.estado];

  return (
    <View style={styles.root}>
      <AppHeader
        titulo={recordatorio.titulo}
        mostrarVolver
        backgroundColor={Colors.agenda.accent}
        textoHablar={`${recordatorio.titulo}. ${recordatorio.descripcion ?? ''}. Estado: ${ESTADO_LABEL[recordatorio.estado]}.`}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconoWrap, { backgroundColor: `${color}22` }]}>
              <Text style={styles.icono}>{recordatorio.icono || '📌'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fechaTexto}>{formatearFechaLegible(recordatorio.fecha)}</Text>
              <Text style={styles.horaTexto}>{recordatorio.hora ? recordatorio.hora.slice(0, 5) : 'Todo el día'}</Text>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: estadoInfo.bg }]}>
              <Text style={[styles.estadoBadgeTexto, { color: estadoInfo.color }]}>{ESTADO_LABEL[recordatorio.estado]}</Text>
            </View>
          </View>

          <View style={[styles.prioridadBarra, { backgroundColor: color }]} />

          {recordatorio.descripcion && <Text style={styles.descripcionTexto}>{recordatorio.descripcion}</Text>}

          {recordatorio.audio_url && (
            <View style={styles.audioBox}>
              <TouchableOpacity
                style={[styles.escucharBtn, reproduciendo && styles.escucharBtnActivo]}
                onPress={reproducirAudio}
                accessibilityRole="button"
                accessibilityLabel={reproduciendo ? 'Pausar mensaje de voz' : 'Escuchar mensaje de voz'}
              >
                <Ionicons
                  name={reproduciendo ? 'pause' : 'volume-medium'}
                  size={20}
                  color={reproduciendo ? Colors.speak.active : Colors.brand.greenDark}
                />
                <Text style={[styles.escucharBtnTexto, reproduciendo && { color: Colors.speak.active }]}>
                  {reproduciendo ? 'Pausar' : 'Escuchar'} mensaje de voz
                  {recordatorio.audio_duracion_segundos ? ` · ${formatearDuracion(recordatorio.audio_duracion_segundos)}` : ''}
                </Text>
              </TouchableOpacity>
              {recordatorio.audio_transcripcion && (
                <View style={styles.transcripcionBox}>
                  <Text style={styles.transcripcionLabel}>Transcripción automática:</Text>
                  <Text style={styles.transcripcionTexto}>{recordatorio.audio_transcripcion}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.metaRow}>
            <Ionicons name="repeat" size={18} color={Colors.text.hint} />
            <Text style={styles.metaTexto}>{RECURRENCIA_LABEL[recordatorio.recurrencia_tipo]}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="notifications-outline" size={18} color={Colors.text.hint} />
            <Text style={styles.metaTexto}>
              {recordatorio.recordatorio_offset_minutos === null || recordatorio.recordatorio_offset_minutos === undefined
                ? 'Sin notificación'
                : NOTIFICACION_LABEL[recordatorio.recordatorio_offset_minutos]}
            </Text>
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
  iconoWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  icono: { fontSize: 28 },
  fechaTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  horaTexto: { fontSize: Typography.size.sm, color: Colors.text.hint },
  estadoBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Spacing.radius.full },
  estadoBadgeTexto: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  prioridadBarra: { height: 4, borderRadius: 2 },
  descripcionTexto: { fontSize: Typography.size.md, color: Colors.text.primary, lineHeight: 24 },

  audioBox: { gap: Spacing.sm },
  escucharBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radius.lg,
    backgroundColor: '#E8F5E9',
  },
  escucharBtnActivo: { backgroundColor: Colors.speak.activeBg },
  escucharBtnTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.brand.greenDark },
  transcripcionBox: { backgroundColor: Colors.ui.background, borderRadius: Spacing.radius.md, padding: Spacing.md },
  transcripcionLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.hint, marginBottom: 4 },
  transcripcionTexto: { fontSize: Typography.size.sm, color: Colors.text.primary, lineHeight: 20 },

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
