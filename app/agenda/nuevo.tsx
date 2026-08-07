// Agenda — crear o editar un recordatorio (?editId=<id> activa el modo edición)
// Deliberadamente mínimo: título + fecha + hora. La notificación 30 minutos
// antes es automática y obligatoria, no hay nada que configurar acá.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useAgendaDetalle, useCrearRecordatorio, useEditarRecordatorio } from '@/hooks/useAgenda';
import { DIAS_LETRA_LUNES_PRIMERO, formatearFechaLegible, generarGrillaMes, nombreMes, toISODate } from '@/utils/agendaDateUtils';

const HORAS_RAPIDAS = [
  { label: 'Mañana', hh: '09', mm: '00' },
  { label: 'Mediodía', hh: '12', mm: '00' },
  { label: 'Tarde', hh: '16', mm: '00' },
  { label: 'Noche', hh: '20', mm: '00' },
];

export default function NuevoRecordatorioScreen() {
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const modoEdicion = !!editId;

  const { data: existente, isLoading: cargandoExistente } = useAgendaDetalle(editId ?? null);
  const crearMutation = useCrearRecordatorio();
  const editarMutation = useEditarRecordatorio();

  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(() => toISODate(new Date()));
  const [mesCalendario, setMesCalendario] = useState(() => new Date());
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [horaHH, setHoraHH] = useState('09');
  const [horaMM, setHoraMM] = useState('00');

  const precargadoRef = useRef(false);

  // Precarga los campos cuando se abre en modo edición
  useEffect(() => {
    if (!existente || precargadoRef.current) return;
    precargadoRef.current = true;
    setTitulo(existente.titulo);
    setFecha(existente.fecha);
    setMesCalendario(new Date(`${existente.fecha}T00:00:00`));
    setHoraHH(existente.hora.slice(0, 2));
    setHoraMM(existente.hora.slice(3, 5));
  }, [existente]);

  const guardando = crearMutation.isPending || editarMutation.isPending;

  const guardar = useCallback(async () => {
    if (!titulo.trim()) {
      Alert.alert('Falta el título', 'Escribí un título breve para el recordatorio.');
      return;
    }

    const input = {
      titulo: titulo.trim(),
      fecha,
      hora: `${horaHH.padStart(2, '0')}:${horaMM.padStart(2, '0')}`,
    };

    try {
      if (modoEdicion && editId) {
        await editarMutation.mutateAsync({ id: editId, input });
        router.replace(`/agenda/${editId}` as never);
      } else {
        const creado = await crearMutation.mutateAsync(input);
        router.replace(`/agenda/${creado.id}` as never);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar el recordatorio.';
      Alert.alert('Error', msg);
    }
  }, [titulo, fecha, horaHH, horaMM, modoEdicion, editId, editarMutation, crearMutation]);

  if (modoEdicion && cargandoExistente) {
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

  return (
    <View style={styles.root}>
      <AppHeader
        titulo={modoEdicion ? 'Editar recordatorio' : 'Nuevo recordatorio'}
        mostrarVolver
        backgroundColor={Colors.agenda.accent}
        textoHablar={modoEdicion ? 'Editar recordatorio.' : 'Nuevo recordatorio. Completá los datos y tocá Guardar.'}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxxl }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Título */}
        <Text style={styles.campoLabel}>Título</Text>
        <TextInput
          style={styles.tituloInput}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="¿Qué necesitás recordar?"
          placeholderTextColor={Colors.text.hint}
          maxLength={120}
        />

        {/* Fecha */}
        <Text style={styles.campoLabel}>Fecha</Text>
        <TouchableOpacity style={styles.fechaBtn} onPress={() => setCalendarioAbierto((v) => !v)} accessibilityRole="button">
          <Ionicons name="calendar" size={22} color={Colors.agenda.accentDark} />
          <Text style={styles.fechaBtnTexto}>{formatearFechaLegible(fecha)}</Text>
          <Ionicons name={calendarioAbierto ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.text.hint} />
        </TouchableOpacity>
        {calendarioAbierto && (
          <View style={styles.calendarioBox}>
            <View style={styles.calendarioNavRow}>
              <TouchableOpacity onPress={() => setMesCalendario((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={24} color={Colors.agenda.accent} />
              </TouchableOpacity>
              <Text style={styles.calendarioMesTexto}>{nombreMes(mesCalendario.getMonth())} {mesCalendario.getFullYear()}</Text>
              <TouchableOpacity onPress={() => setMesCalendario((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={24} color={Colors.agenda.accent} />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarioDiasSemana}>
              {DIAS_LETRA_LUNES_PRIMERO.map((d, i) => <Text key={i} style={styles.calendarioDiaLetra}>{d}</Text>)}
            </View>
            <View style={styles.calendarioGrilla}>
              {generarGrillaMes(mesCalendario).map((celda) => (
                <TouchableOpacity
                  key={celda.fecha}
                  style={[styles.calendarioCelda, celda.fecha === fecha && styles.calendarioCeldaSeleccionada]}
                  onPress={() => { setFecha(celda.fecha); setCalendarioAbierto(false); }}
                >
                  <Text style={[
                    styles.calendarioCeldaTexto,
                    !celda.enMes && styles.calendarioCeldaTextoAfuera,
                    celda.fecha === fecha && styles.calendarioCeldaTextoSeleccionado,
                  ]}>
                    {celda.dia}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Hora */}
        <Text style={styles.campoLabel}>Hora</Text>
        <View style={styles.horaInputRow}>
          <TextInput
            style={styles.horaInput}
            value={horaHH}
            onChangeText={(t) => setHoraHH(t.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Hora"
          />
          <Text style={styles.horaSeparador}>:</Text>
          <TextInput
            style={styles.horaInput}
            value={horaMM}
            onChangeText={(t) => setHoraMM(t.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Minutos"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horaRapidaRow}>
          {HORAS_RAPIDAS.map((h) => (
            <TouchableOpacity key={h.label} style={styles.horaRapidaChip} onPress={() => { setHoraHH(h.hh); setHoraMM(h.mm); }}>
              <Text style={styles.horaRapidaTexto}>{h.label} · {h.hh}:{h.mm}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Aviso de notificación — siempre 30 min antes, no configurable */}
        <View style={styles.avisoBox}>
          <Ionicons name="notifications" size={20} color={Colors.agenda.accentDark} />
          <Text style={styles.avisoTexto}>Vas a recibir un aviso 30 minutos antes.</Text>
        </View>

        {/* Guardar */}
        <TouchableOpacity style={[styles.guardarBtn, guardando && styles.guardarBtnDisabled]} onPress={guardar} disabled={guardando}>
          {guardando ? (
            <ActivityIndicator color={Colors.text.onDark} />
          ) : (
            <>
              <Ionicons name={modoEdicion ? 'checkmark' : 'save'} size={22} color={Colors.text.onDark} />
              <Text style={styles.guardarTexto}>{modoEdicion ? 'Guardar cambios' : 'Guardar recordatorio'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  cargandoContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  cargandoTexto: { fontSize: Typography.size.md, color: Colors.text.secondary, fontWeight: Typography.weight.semibold },
  scroll: { padding: Spacing.screen.horizontal, gap: Spacing.sm },

  campoLabel: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  tituloInput: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    minHeight: Spacing.touch.comfortable,
  },

  fechaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    paddingHorizontal: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
  },
  fechaBtnTexto: { flex: 1, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary },

  calendarioBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  calendarioNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  calendarioMesTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  calendarioDiasSemana: { flexDirection: 'row' },
  calendarioDiaLetra: { flex: 1, textAlign: 'center', fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.hint },
  calendarioGrilla: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarioCelda: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Spacing.radius.md },
  calendarioCeldaSeleccionada: { backgroundColor: Colors.agenda.accent },
  calendarioCeldaTexto: { fontSize: Typography.size.sm, color: Colors.text.primary },
  calendarioCeldaTextoAfuera: { color: Colors.text.hint },
  calendarioCeldaTextoSeleccionado: { color: Colors.text.onDark, fontWeight: Typography.weight.bold },

  horaInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  horaInput: {
    width: 72,
    textAlign: 'center',
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    paddingVertical: Spacing.sm,
  },
  horaSeparador: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  horaRapidaRow: { gap: Spacing.sm, marginTop: Spacing.md },
  horaRapidaChip: {
    backgroundColor: Colors.ui.surface,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  horaRapidaTexto: { fontSize: Typography.size.sm, color: Colors.text.secondary, fontWeight: Typography.weight.semibold },

  avisoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#E8EAF6',
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
    marginTop: Spacing.xl,
  },
  avisoTexto: { flex: 1, fontSize: Typography.size.sm, color: Colors.agenda.accentDark, fontWeight: Typography.weight.semibold },

  guardarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.greenDark,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.xl,
    marginTop: Spacing.xxl,
    minHeight: Spacing.touch.comfortable,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  guardarBtnDisabled: { opacity: 0.7 },
  guardarTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
});
