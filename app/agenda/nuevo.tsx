// Agenda — crear o editar un recordatorio (?editId=<id> activa el modo edición)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import {
  useAgendaDetalle,
  useCrearRecordatorio,
  useEditarRecordatorio,
  useSubirAudioAgenda,
} from '@/hooks/useAgenda';
import type { OffsetNotificacion, PrioridadRecordatorio, RecurrenciaTipo } from '@/services/agendaService';
import { DIAS_LETRA_LUNES_PRIMERO, formatearFechaLegible, generarGrillaMes, nombreMes, toISODate } from '@/utils/agendaDateUtils';

const RAPIDOS: { emoji: string; label: string }[] = [
  { emoji: '💊', label: 'Tomar medicamento' },
  { emoji: '👨‍⚕️', label: 'Turno médico' },
  { emoji: '🎂', label: 'Evento' },
  { emoji: '📞', label: 'Llamar a alguien' },
  { emoji: '🛒', label: 'Comprar algo' },
  { emoji: '💧', label: 'Tomar agua' },
  { emoji: '🚶', label: 'Salir a caminar' },
  { emoji: '🍽️', label: 'Almorzar' },
  { emoji: '💤', label: 'Dormir' },
];

const RECURRENCIAS: { id: RecurrenciaTipo; label: string }[] = [
  { id: 'ninguna', label: 'No repetir' },
  { id: 'diaria', label: 'Todos los días' },
  { id: 'laborables', label: 'Lunes a viernes' },
  { id: 'semanal', label: 'Todas las semanas' },
  { id: 'mensual', label: 'Todos los meses' },
  { id: 'anual', label: 'Todos los años' },
  { id: 'personalizada', label: 'Días personalizados' },
];

const NOTIFICACIONES: { valor: OffsetNotificacion | null; label: string }[] = [
  { valor: null, label: 'Sin notificación' },
  { valor: 0, label: 'En el momento' },
  { valor: 10, label: '10 minutos antes' },
  { valor: 30, label: '30 minutos antes' },
  { valor: 60, label: '1 hora antes' },
  { valor: 1440, label: '1 día antes' },
];

const HORAS_RAPIDAS = [
  { label: 'Mañana', hh: '09', mm: '00' },
  { label: 'Mediodía', hh: '12', mm: '00' },
  { label: 'Tarde', hh: '16', mm: '00' },
  { label: 'Noche', hh: '20', mm: '00' },
];

function formatearDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function NuevoRecordatorioScreen() {
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const modoEdicion = !!editId;

  const { data: existente, isLoading: cargandoExistente } = useAgendaDetalle(editId ?? null);
  const crearMutation = useCrearRecordatorio();
  const editarMutation = useEditarRecordatorio();
  const subirAudioMutation = useSubirAudioAgenda();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [icono, setIcono] = useState('📌');
  const [prioridad, setPrioridad] = useState<PrioridadRecordatorio>('media');
  const [fecha, setFecha] = useState(() => toISODate(new Date()));
  const [mesCalendario, setMesCalendario] = useState(() => new Date());
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [todoElDia, setTodoElDia] = useState(true);
  const [horaHH, setHoraHH] = useState('09');
  const [horaMM, setHoraMM] = useState('00');
  const [recurrencia, setRecurrencia] = useState<RecurrenciaTipo>('ninguna');
  const [diasPersonalizados, setDiasPersonalizados] = useState<number[]>([]);
  const [notificacion, setNotificacion] = useState<OffsetNotificacion | null>(null);

  const [grabando, setGrabando] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioUrlSubido, setAudioUrlSubido] = useState<string | null>(null);
  const [transcripcion, setTranscripcion] = useState<string | null>(null);
  const [duracionSegundos, setDuracionSegundos] = useState(0);
  const [subiendoAudio, setSubiendoAudio] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const inicioGrabacionRef = useRef(0);
  const precargadoRef = useRef(false);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  // Precarga los campos cuando se abre en modo edición
  useEffect(() => {
    if (!existente || precargadoRef.current) return;
    precargadoRef.current = true;
    setTitulo(existente.titulo);
    setDescripcion(existente.descripcion ?? '');
    setIcono(existente.icono ?? '📌');
    setPrioridad(existente.prioridad);
    setFecha(existente.fecha);
    setMesCalendario(new Date(`${existente.fecha}T00:00:00`));
    if (existente.hora) {
      setTodoElDia(false);
      setHoraHH(existente.hora.slice(0, 2));
      setHoraMM(existente.hora.slice(3, 5));
    }
    setRecurrencia(existente.recurrencia_tipo);
    setDiasPersonalizados(existente.recurrencia_dias_semana ?? []);
    setNotificacion(existente.recordatorio_offset_minutos);
    if (existente.audio_url) {
      setAudioUrlSubido(existente.audio_url);
      setTranscripcion(existente.audio_transcripcion);
      setDuracionSegundos(existente.audio_duracion_segundos ?? 0);
    }
  }, [existente]);

  const aplicarRapido = useCallback((r: { emoji: string; label: string }) => {
    setTitulo(r.label);
    setIcono(r.emoji);
  }, []);

  const toggleDiaPersonalizado = useCallback((dia: number) => {
    setDiasPersonalizados((prev) => (prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()));
  }, []);

  // ── Grabación de audio ────────────────────────────────────────────────────

  const iniciarGrabacion = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso de micrófono', 'Para grabar audio, activá el permiso en los ajustes del teléfono.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      inicioGrabacionRef.current = Date.now();
      setGrabando(true);
    } catch (err) {
      console.warn('[Agenda] Error al iniciar grabación:', err);
      Alert.alert('Error', 'No se pudo iniciar el micrófono. Intentá de nuevo.');
    }
  }, []);

  const detenerGrabacion = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setGrabando(false);
      if (!uri) return;

      const duracion = Math.round((Date.now() - inicioGrabacionRef.current) / 1000);
      setAudioUri(uri);
      setDuracionSegundos(duracion);
      setSubiendoAudio(true);
      try {
        const resultado = await subirAudioMutation.mutateAsync({ audioUri: uri, duracionSegundos: duracion });
        setAudioUrlSubido(resultado.audio_url);
        setTranscripcion(resultado.audio_transcripcion);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo subir el audio.';
        Alert.alert('Error', msg);
        setAudioUri(null);
      } finally {
        setSubiendoAudio(false);
      }
    } catch (err) {
      console.warn('[Agenda] Error al detener grabación:', err);
      setGrabando(false);
    }
  }, [subirAudioMutation]);

  const reproducirAudio = useCallback(async () => {
    const uri = audioUri ?? audioUrlSubido;
    if (!uri) return;
    try {
      if (reproduciendo) {
        await soundRef.current?.stopAsync().catch(() => {});
        setReproduciendo(false);
        return;
      }
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      setReproduciendo(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setReproduciendo(false);
      });
    } catch (err) {
      console.warn('[Agenda] Error al reproducir:', err);
    }
  }, [audioUri, audioUrlSubido, reproduciendo]);

  const borrarAudio = useCallback(() => {
    soundRef.current?.unloadAsync().catch(() => {});
    setAudioUri(null);
    setAudioUrlSubido(null);
    setTranscripcion(null);
    setDuracionSegundos(0);
    setReproduciendo(false);
  }, []);

  // ── Guardar ────────────────────────────────────────────────────────────────

  const guardando = crearMutation.isPending || editarMutation.isPending;

  const guardar = useCallback(async () => {
    if (!titulo.trim()) {
      Alert.alert('Falta el título', 'Escribí un título breve para el recordatorio.');
      return;
    }
    if (recurrencia === 'personalizada' && diasPersonalizados.length === 0) {
      Alert.alert('Faltan los días', 'Elegí al menos un día de la semana para la repetición personalizada.');
      return;
    }

    const input = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      fecha,
      hora: todoElDia ? null : `${horaHH.padStart(2, '0')}:${horaMM.padStart(2, '0')}`,
      prioridad,
      icono,
      recordatorio_offset_minutos: notificacion,
      recurrencia_tipo: recurrencia,
      recurrencia_dias_semana: recurrencia === 'personalizada' ? diasPersonalizados : null,
      audio_url: audioUrlSubido,
      audio_transcripcion: transcripcion,
      audio_duracion_segundos: audioUrlSubido ? duracionSegundos : null,
    };

    try {
      if (modoEdicion && editId) {
        await editarMutation.mutateAsync({ id: editId, input });
        router.replace(`/agenda/${editId}` as never);
      } else {
        const creado = await crearMutation.mutateAsync({ ...input, origen: 'manual' });
        router.replace(`/agenda/${creado.id}` as never);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar el recordatorio.';
      Alert.alert('Error', msg);
    }
  }, [
    titulo, descripcion, fecha, todoElDia, horaHH, horaMM, prioridad, icono, notificacion,
    recurrencia, diasPersonalizados, audioUrlSubido, transcripcion, duracionSegundos,
    modoEdicion, editId, editarMutation, crearMutation,
  ]);

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
        {/* Recordatorios rápidos */}
        {!modoEdicion && (
          <>
            <Text style={styles.campoLabel}>Recordatorios rápidos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rapidosRow}>
              {RAPIDOS.map((r) => (
                <TouchableOpacity key={r.label} style={styles.rapidoChip} onPress={() => aplicarRapido(r)}>
                  <Text style={styles.rapidoEmoji}>{r.emoji}</Text>
                  <Text style={styles.rapidoLabel}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Título */}
        <Text style={styles.campoLabel}>Título</Text>
        <View style={styles.tituloRow}>
          <TouchableOpacity style={styles.iconoBtn} onPress={() => setIcono(icono === '📌' ? '⭐' : '📌')} accessibilityLabel="Cambiar ícono">
            <Text style={styles.iconoBtnTexto}>{icono}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.tituloInput}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="¿Qué necesitás recordar?"
            placeholderTextColor={Colors.text.hint}
            maxLength={120}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconosRow}>
          {['📌', '💊', '👨‍⚕️', '🎂', '📞', '🛒', '💧', '🚶', '🍽️', '💤', '⭐', '🎁', '🐾', '🧾'].map((e) => (
            <TouchableOpacity key={e} style={[styles.iconoOpcion, icono === e && styles.iconoOpcionActiva]} onPress={() => setIcono(e)}>
              <Text style={styles.iconoOpcionTexto}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Descripción */}
        <Text style={styles.campoLabel}>Descripción (opcional)</Text>
        <TextInput
          style={styles.descripcionInput}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Agregá más detalles si querés..."
          placeholderTextColor={Colors.text.hint}
          multiline
          numberOfLines={3}
        />

        {/* Audio */}
        <Text style={styles.campoLabel}>Audio (opcional)</Text>
        {!audioUri && !audioUrlSubido && !grabando ? (
          <TouchableOpacity style={styles.grabarBtn} onPress={iniciarGrabacion} accessibilityRole="button" accessibilityLabel="Grabar mensaje de voz">
            <Ionicons name="mic" size={26} color={Colors.text.onDark} />
            <Text style={styles.grabarTexto}>Grabar mensaje de voz</Text>
          </TouchableOpacity>
        ) : grabando ? (
          <TouchableOpacity style={styles.grabandoBtn} onPress={detenerGrabacion} accessibilityRole="button" accessibilityLabel="Detener grabación">
            <View style={styles.puntoRojo} />
            <Text style={styles.grabandoTexto}>Grabando... Tocá para detener</Text>
          </TouchableOpacity>
        ) : subiendoAudio ? (
          <View style={styles.subiendoBox}>
            <ActivityIndicator color={Colors.agenda.accent} />
            <Text style={styles.subiendoTexto}>Subiendo y transcribiendo...</Text>
          </View>
        ) : (
          <View style={styles.audioBox}>
            <View style={styles.audioPreviewRow}>
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
                  {reproduciendo ? 'Pausar' : 'Escuchar'} · {formatearDuracion(duracionSegundos)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.borrarAudioBtn} onPress={borrarAudio} accessibilityRole="button" accessibilityLabel="Borrar audio">
                <Ionicons name="trash" size={22} color={Colors.brand.red} />
              </TouchableOpacity>
            </View>
            {transcripcion && (
              <View style={styles.transcripcionBox}>
                <Text style={styles.transcripcionLabel}>Transcripción automática:</Text>
                <Text style={styles.transcripcionTexto}>{transcripcion}</Text>
              </View>
            )}
          </View>
        )}

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
        <View style={styles.horaToggleRow}>
          <TouchableOpacity style={[styles.horaToggleBtn, todoElDia && styles.horaToggleBtnActivo]} onPress={() => setTodoElDia(true)}>
            <Text style={[styles.horaToggleTexto, todoElDia && styles.horaToggleTextoActivo]}>Todo el día</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.horaToggleBtn, !todoElDia && styles.horaToggleBtnActivo]} onPress={() => setTodoElDia(false)}>
            <Text style={[styles.horaToggleTexto, !todoElDia && styles.horaToggleTextoActivo]}>A una hora</Text>
          </TouchableOpacity>
        </View>
        {!todoElDia && (
          <>
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
          </>
        )}

        {/* Repetición */}
        <Text style={styles.campoLabel}>Repetición</Text>
        <View style={styles.opcionesWrap}>
          {RECURRENCIAS.map((r) => {
            const activo = recurrencia === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.opcionChip, activo && styles.opcionChipActiva]}
                onPress={() => setRecurrencia(r.id)}
              >
                <Text style={[styles.opcionChipTexto, activo && styles.opcionChipTextoActiva]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {recurrencia === 'personalizada' && (
          <View style={styles.diasPersonalizadosRow}>
            {DIAS_LETRA_LUNES_PRIMERO.map((letra, i) => {
              const diaJs = i === 6 ? 0 : i + 1; // convierte índice lunes-primero a getDay() (0=domingo)
              const activo = diasPersonalizados.includes(diaJs);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.diaPersonalizadoBtn, activo && styles.diaPersonalizadoBtnActivo]}
                  onPress={() => toggleDiaPersonalizado(diaJs)}
                >
                  <Text style={[styles.diaPersonalizadoTexto, activo && { color: Colors.text.onDark }]}>{letra}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Notificación */}
        <Text style={styles.campoLabel}>Notificación</Text>
        <View style={styles.opcionesWrap}>
          {NOTIFICACIONES.map((n) => {
            const activo = notificacion === n.valor;
            return (
              <TouchableOpacity
                key={n.label}
                style={[styles.opcionChip, activo && styles.opcionChipActiva]}
                onPress={() => setNotificacion(n.valor)}
              >
                <Text style={[styles.opcionChipTexto, activo && styles.opcionChipTextoActiva]}>{n.label}</Text>
              </TouchableOpacity>
            );
          })}
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

  rapidosRow: { gap: Spacing.sm, paddingBottom: Spacing.xs },
  rapidoChip: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    width: 92,
  },
  rapidoEmoji: { fontSize: 28 },
  rapidoLabel: { fontSize: Typography.size.xs, color: Colors.text.secondary, textAlign: 'center' },

  tituloRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconoBtn: {
    width: Spacing.touch.comfortable,
    height: Spacing.touch.comfortable,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.ui.surface,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoBtnTexto: { fontSize: 26 },
  tituloInput: {
    flex: 1,
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
  iconosRow: { gap: Spacing.sm, paddingTop: Spacing.sm },
  iconoOpcion: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ui.surface,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoOpcionActiva: { borderColor: Colors.agenda.accent, backgroundColor: '#E8EAF6' },
  iconoOpcionTexto: { fontSize: 22 },

  descripcionInput: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    minHeight: 90,
    textAlignVertical: 'top',
  },

  grabarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.agenda.accent,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
  },
  grabarTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  grabandoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: Spacing.radius.lg,
    borderWidth: 2,
    borderColor: Colors.brand.red,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
  },
  puntoRojo: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.brand.red },
  grabandoTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.brand.red },
  subiendoBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  subiendoTexto: { fontSize: Typography.size.md, color: Colors.text.secondary },

  audioBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  audioPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  escucharBtn: {
    flex: 1,
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
  borrarAudioBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  transcripcionBox: { backgroundColor: Colors.ui.background, borderRadius: Spacing.radius.md, padding: Spacing.md },
  transcripcionLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.hint, marginBottom: 4 },
  transcripcionTexto: { fontSize: Typography.size.sm, color: Colors.text.primary, lineHeight: 20 },

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

  horaToggleRow: { flexDirection: 'row', gap: Spacing.sm },
  horaToggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.surface,
  },
  horaToggleBtnActivo: { backgroundColor: Colors.agenda.accent, borderColor: Colors.agenda.accent },
  horaToggleTexto: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.secondary },
  horaToggleTextoActivo: { color: Colors.text.onDark },
  horaInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.md },
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

  opcionesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  opcionChip: {
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.ui.surface,
  },
  opcionChipActiva: { backgroundColor: Colors.agenda.accent, borderColor: Colors.agenda.accent },
  opcionChipTexto: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.secondary },
  opcionChipTextoActiva: { color: Colors.text.onDark },

  diasPersonalizadosRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  diaPersonalizadoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ui.surface,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
  },
  diaPersonalizadoBtnActivo: { backgroundColor: Colors.agenda.accent, borderColor: Colors.agenda.accent },
  diaPersonalizadoTexto: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.primary },

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
