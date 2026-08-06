import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { usePedidos, useEnviarPedido, useEditarPedido } from '@/hooks/usePedidos';
import type { EstadoPedido, PedidoSugerencia, TipoPedido } from '@/services/pedidosService';

interface TipoInfo {
  id: TipoPedido;
  emoji: string;
  label: string;
  color: string;
}

const TIPOS: TipoInfo[] = [
  { id: 'pedido', emoji: '📋', label: 'Pedido', color: Colors.brand.blueDark },
  { id: 'comentario', emoji: '💬', label: 'Comentario', color: Colors.brand.greenMedium },
  { id: 'sugerencia', emoji: '💡', label: 'Sugerencia', color: Colors.brand.orange },
  { id: 'actividad_propuesta', emoji: '🎉', label: 'Actividad propuesta', color: Colors.brand.purple },
  { id: 'recomendacion_pelicula', emoji: '🎬', label: 'Recomendación de película', color: Colors.brand.red },
];

const ESTADO_INFO: Record<EstadoPedido, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#B26A00', bg: '#FFF3E0' },
  en_proceso: { label: 'En proceso', color: '#0D47A1', bg: '#E3F2FD' },
  resuelta: { label: 'Resuelta', color: '#1B5E3B', bg: '#E8F5E9' },
};

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function formatearDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PedidosScreen() {
  const { data: pedidos, isLoading } = usePedidos();
  const enviarMutation = useEnviarPedido();
  const editarMutation = useEditarPedido();

  const [tipo, setTipo] = useState<TipoPedido>('pedido');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [grabando, setGrabando] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duracionSegundos, setDuracionSegundos] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const inicioGrabacionRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

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
      console.warn('[Pedidos] Error al iniciar grabación:', err);
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
      if (uri) {
        setAudioUri(uri);
        setDuracionSegundos(Math.round((Date.now() - inicioGrabacionRef.current) / 1000));
      }
    } catch (err) {
      console.warn('[Pedidos] Error al detener grabación:', err);
      setGrabando(false);
    }
  }, []);

  const reproducirAudio = useCallback(async () => {
    if (!audioUri) return;
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
      soundRef.current = sound;
      setReproduciendo(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setReproduciendo(false);
      });
    } catch (err) {
      console.warn('[Pedidos] Error al reproducir:', err);
    }
  }, [audioUri]);

  const detenerAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      setReproduciendo(false);
    }
  }, []);

  const borrarAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setAudioUri(null);
    setDuracionSegundos(0);
    setReproduciendo(false);
  }, []);

  const iniciarEdicion = useCallback((p: PedidoSugerencia) => {
    setEditandoId(p.id);
    setTipo(p.tipo);
    setTitulo(p.titulo);
    setDescripcion(p.descripcion ?? '');
  }, []);

  const cancelarEdicion = useCallback(() => {
    setEditandoId(null);
    setTipo('pedido');
    setTitulo('');
    setDescripcion('');
  }, []);

  const handleEnviar = useCallback(async () => {
    if (!titulo.trim()) {
      Alert.alert('Falta el título', 'Escribí un título breve para tu mensaje.');
      return;
    }
    if (editandoId) {
      try {
        await editarMutation.mutateAsync({
          id: editandoId,
          input: { titulo: titulo.trim(), descripcion: descripcion.trim() || undefined },
        });
        cancelarEdicion();
        Alert.alert('¡Listo!', 'Tu mensaje fue actualizado.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo guardar los cambios.';
        Alert.alert('Error', msg);
      }
      return;
    }
    try {
      await enviarMutation.mutateAsync({
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        audioUri,
        duracionSegundos: audioUri ? duracionSegundos : undefined,
      });
      setTitulo('');
      setDescripcion('');
      await borrarAudio();
      Alert.alert('¡Listo!', 'Tu mensaje fue enviado al personal.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar tu mensaje.';
      Alert.alert('Error', msg);
    }
  }, [editandoId, tipo, titulo, descripcion, audioUri, duracionSegundos, enviarMutation, editarMutation, borrarAudio, cancelarEdicion]);

  const tipoActivo = TIPOS.find((t) => t.id === tipo) ?? TIPOS[0];
  const tieneTexto = descripcion.trim().length > 0;
  const tieneAudio = grabando || !!audioUri;

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Sugerencias"
        mostrarVolver
        backgroundColor={Colors.brand.blueDark}
        textoHablar="Sugerencias. Enviá un pedido, comentario o sugerencia al personal."
      />

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={Spacing.xl}
        keyboardShouldPersistTaps="handled"
      >
        {editandoId ? (
          <View style={styles.editandoAviso}>
            <Ionicons name="pencil" size={20} color={Colors.brand.blueDark} />
            <Text style={styles.editandoTexto}>Editando: {tipoActivo.emoji} {tipoActivo.label}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.seccionTitulo}>¿Qué querés enviar?</Text>
            <View style={styles.tiposGrid}>
              {TIPOS.map((t) => {
                const activo = t.id === tipo;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tipoChip, activo && { backgroundColor: t.color, borderColor: t.color }]}
                    onPress={() => setTipo(t.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t.label}
                    accessibilityState={{ selected: activo }}
                  >
                    <Text style={styles.tipoEmoji}>{t.emoji}</Text>
                    <Text style={[styles.tipoLabel, activo && styles.tipoLabelActivo]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.campoLabel}>Título</Text>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ej: Falta agua en la habitación"
          placeholderTextColor={Colors.text.hint}
          maxLength={120}
        />

        <Text style={styles.campoLabel}>{editandoId ? 'Descripción' : 'Descripción o audio (opcional)'}</Text>
        <View style={styles.combinadoBox}>
          <TextInput
            style={[styles.inputCombo, !editandoId && tieneAudio && styles.inputComboDeshabilitado]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Contanos más detalles..."
            placeholderTextColor={Colors.text.hint}
            multiline
            numberOfLines={4}
            editable={editandoId ? true : !tieneAudio}
          />

          {!editandoId && (
            <>
              <View style={styles.divisorRow}>
                <View style={styles.divisorLinea} />
                <Text style={styles.divisorTexto}>o</Text>
                <View style={styles.divisorLinea} />
              </View>

              {!audioUri && !grabando && (
                <TouchableOpacity
                  style={[styles.grabarBtn, tieneTexto && styles.grabarBtnDeshabilitado]}
                  onPress={iniciarGrabacion}
                  disabled={tieneTexto}
                  accessibilityRole="button"
                  accessibilityLabel="Grabar audio"
                  accessibilityState={{ disabled: tieneTexto }}
                >
                  <Ionicons name="mic" size={26} color={Colors.text.onDark} />
                  <Text style={styles.grabarTexto}>Grabar audio</Text>
                </TouchableOpacity>
              )}

              {grabando && (
                <TouchableOpacity style={styles.grabandoBtn} onPress={detenerGrabacion} accessibilityRole="button" accessibilityLabel="Detener grabación">
                  <View style={styles.puntoRojo} />
                  <Text style={styles.grabandoTexto}>Grabando... Tocá para detener</Text>
                </TouchableOpacity>
              )}

              {audioUri && !grabando && (
                <View style={styles.audioPreview}>
                  <TouchableOpacity
                    style={styles.audioPlayBtn}
                    onPress={reproduciendo ? detenerAudio : reproducirAudio}
                    accessibilityRole="button"
                    accessibilityLabel={reproduciendo ? 'Pausar audio' : 'Escuchar audio grabado'}
                  >
                    <Ionicons name={reproduciendo ? 'pause' : 'play'} size={24} color={Colors.text.onDark} />
                  </TouchableOpacity>
                  <Text style={styles.audioDuracion}>{formatearDuracion(duracionSegundos)}</Text>
                  <TouchableOpacity style={styles.audioAccionBtn} onPress={iniciarGrabacion} accessibilityRole="button" accessibilityLabel="Grabar de nuevo">
                    <Ionicons name="refresh" size={22} color={Colors.brand.blueDark} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.audioAccionBtn} onPress={borrarAudio} accessibilityRole="button" accessibilityLabel="Borrar audio">
                    <Ionicons name="trash" size={22} color={Colors.brand.red} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        <View style={editandoId ? styles.accionesRow : undefined}>
          {editandoId && (
            <TouchableOpacity
              style={styles.cancelarBtn}
              onPress={cancelarEdicion}
              disabled={editarMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Cancelar edición"
            >
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.enviarBtn, editandoId && styles.enviarBtnEditando, (enviarMutation.isPending || editarMutation.isPending) && styles.enviarBtnDisabled]}
            onPress={handleEnviar}
            disabled={enviarMutation.isPending || editarMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={editandoId ? 'Guardar cambios' : 'Enviar'}
          >
            {enviarMutation.isPending || editarMutation.isPending ? (
              <ActivityIndicator color={Colors.text.onDark} />
            ) : (
              <>
                <Ionicons name={editandoId ? 'checkmark' : 'send'} size={22} color={Colors.text.onDark} />
                <Text style={styles.enviarTexto}>{editandoId ? 'Guardar cambios' : 'Enviar'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Historial de mis mensajes ── */}
        <Text style={[styles.seccionTitulo, { marginTop: Spacing.xxl }]}>Mis mensajes enviados</Text>
        {isLoading ? (
          <ActivityIndicator color={Colors.brand.blueDark} style={{ marginTop: Spacing.lg }} />
        ) : !pedidos || pedidos.length === 0 ? (
          <Text style={styles.vacioTexto}>Todavía no enviaste ningún mensaje.</Text>
        ) : (
          pedidos.map((p) => {
            const info = TIPOS.find((t) => t.id === p.tipo);
            const estado = ESTADO_INFO[p.estado];
            const puedeEditar = p.estado === 'pendiente';
            return (
              <View key={p.id} style={[styles.historialCard, p.id === editandoId && styles.historialCardEditando]}>
                <View style={styles.historialTop}>
                  <Text style={styles.historialEmoji}>{info?.emoji ?? '📋'}</Text>
                  <Text style={styles.historialTitulo} numberOfLines={2}>{p.titulo}</Text>
                </View>
                <View style={styles.historialBottom}>
                  <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
                    <Text style={[styles.estadoTexto, { color: estado.color }]}>{estado.label}</Text>
                  </View>
                  <Text style={styles.historialFecha}>{formatearFecha(p.created_at)}</Text>
                  {p.audio_url ? <Ionicons name="mic" size={16} color={Colors.text.hint} /> : null}
                  {puedeEditar && (
                    <TouchableOpacity
                      style={styles.editarBtn}
                      onPress={() => iniciarEdicion(p)}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${p.titulo}`}
                    >
                      <Ionicons name="pencil" size={18} color={Colors.text.onDark} />
                      <Text style={styles.editarTexto}>Editar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.screen.horizontal, paddingBottom: Spacing.xxxl },
  seccionTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tipoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.ui.surface,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    minHeight: Spacing.touch.min,
  },
  tipoEmoji: { fontSize: 22 },
  tipoLabel: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  tipoLabelActivo: { color: Colors.text.onDark },
  campoLabel: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
    minHeight: Spacing.touch.min,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  combinadoBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  inputCombo: {
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
    padding: 0,
  },
  inputComboDeshabilitado: { color: Colors.text.hint },
  divisorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.md },
  divisorLinea: { flex: 1, height: 1, backgroundColor: Colors.ui.border },
  divisorTexto: { fontSize: Typography.size.sm, color: Colors.text.hint, fontWeight: Typography.weight.medium },
  grabarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.blueDark,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
  },
  grabarBtnDeshabilitado: { backgroundColor: Colors.ui.border },
  grabarTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  grabandoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.brand.red,
    minHeight: Spacing.touch.comfortable,
  },
  puntoRojo: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.brand.red },
  grabandoTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.brand.red },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  audioPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brand.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioDuracion: { flex: 1, fontSize: Typography.size.md, fontWeight: Typography.weight.medium, color: Colors.text.primary },
  audioAccionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  enviarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.greenDark,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.xl,
    marginTop: Spacing.md,
    minHeight: Spacing.touch.comfortable,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  enviarBtnDisabled: { opacity: 0.7 },
  enviarBtnEditando: { flex: 1, marginTop: 0 },
  enviarTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  accionesRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  cancelarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.radius.xl,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    paddingVertical: Spacing.xl,
    minHeight: Spacing.touch.comfortable,
  },
  cancelarTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  editandoAviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#E3F2FD',
    borderRadius: Spacing.radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    minHeight: Spacing.touch.min,
  },
  editandoTexto: { flex: 1, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.brand.blueDark },
  vacioTexto: { fontSize: Typography.size.md, color: Colors.text.hint, fontStyle: 'italic' },
  historialCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  historialCardEditando: { borderWidth: 2, borderColor: Colors.brand.blueDark },
  historialTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  historialEmoji: { fontSize: 20 },
  historialTitulo: { flex: 1, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  editarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.brand.blueDark,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: Spacing.touch.min,
  },
  editarTexto: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  historialBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  estadoBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Spacing.radius.full },
  estadoTexto: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  historialFecha: { flex: 1, fontSize: Typography.size.xs, color: Colors.text.hint },
});
