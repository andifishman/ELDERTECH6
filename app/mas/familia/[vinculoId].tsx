// Mi familia — conversación con un familiar
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from '@/utils/audioCompat';
import { useGrabadoraDeVoz } from '@/hooks/useGrabadoraDeVoz';
import { formatearDuracion } from '@/utils/formatoDuracion';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useConversacionesFamilia, useMensajesFamilia, useResponderFamilia, useResponderFamiliaConAudio } from '@/hooks/useMiFamilia';
import type { MensajeFamilia } from '@/services/miFamiliaService';

function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MiFamiliaConversacionScreen() {
  const { vinculoId } = useLocalSearchParams<{ vinculoId: string }>();
  const id = Array.isArray(vinculoId) ? (vinculoId[0] ?? '') : (vinculoId ?? '');
  const { data: conversaciones } = useConversacionesFamilia();
  const { data: mensajes, isLoading, isError, refetch } = useMensajesFamilia(id);
  const responder = useResponderFamilia(id);
  const responderAudio = useResponderFamiliaConAudio(id);
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const lista = useRef<FlatList<MensajeFamilia>>(null);
  const { grabando, iniciar: iniciarGrabacion, detener: detenerGrabadora, descartar: borrarGrabacion } = useGrabadoraDeVoz('MiFamilia');
  const [reproduciendoId, setReproduciendoId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // "Enviar" manda el audio directo, sin pantalla intermedia: borrar o mandar, nada más.
  const detenerYEnviarGrabacion = useCallback(async () => {
    const grabacion = await detenerGrabadora();
    if (!grabacion) {
      Alert.alert('Error', 'No se pudo guardar el mensaje de voz. Intentá de nuevo.');
      return;
    }
    try {
      await responderAudio.mutateAsync({ audioUri: grabacion.uri, duracionSegundos: grabacion.duracionSegundos });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo enviar el mensaje de voz.');
    }
  }, [detenerGrabadora, responderAudio]);

  const toggleReproducir = useCallback(
    async (mensaje: MensajeFamilia) => {
      if (!mensaje.audioUrl) return;
      if (reproduciendoId === mensaje.id) {
        await soundRef.current?.stopAsync().catch(() => {});
        setReproduciendoId(null);
        return;
      }
      try {
        if (soundRef.current) await soundRef.current.unloadAsync();
        const { sound } = await Audio.Sound.createAsync({ uri: mensaje.audioUrl }, { shouldPlay: true });
        soundRef.current = sound;
        setReproduciendoId(mensaje.id);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) setReproduciendoId(null);
        });
      } catch (err) {
        console.warn('[MiFamilia] Error al reproducir:', err);
      }
    },
    [reproduciendoId],
  );

  const conversacion = conversaciones?.find((c) => c.vinculoId === id);
  const nombre = conversacion?.familiar ?? 'Familiar';
  const puedeEnviar = texto.trim().length > 0 && !responder.isPending;

  useEffect(() => {
    if ((mensajes?.length ?? 0) > 0) setTimeout(() => lista.current?.scrollToEnd({ animated: false }), 50);
  }, [mensajes?.length]);

  const enviar = () => {
    if (!puedeEnviar) return;
    responder.mutate(texto.trim(), { onSuccess: () => setTexto('') });
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader titulo={nombre} mostrarVolver backgroundColor={Colors.hablemos.accent} textoHablar={`Conversación con ${nombre}, de tu familia.`} />

      {isLoading ? (
        <ActivityIndicator color={Colors.hablemos.accent} style={{ marginTop: Spacing.xxl }} />
      ) : isError ? (
        <View style={styles.centro}>
          <Text style={styles.vacioTexto}>No pudimos cargar los mensajes.</Text>
          <TouchableOpacity style={styles.reintentar} onPress={() => void refetch()} accessibilityRole="button" accessibilityLabel="Reintentar">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={lista}
          data={mensajes ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.mensajes}
          ListEmptyComponent={<Text style={[styles.vacioTexto, { marginTop: Spacing.section }]}>Todavía no hay mensajes.</Text>}
          renderItem={({ item }) => {
            const propio = item.autor === 'residente';
            return (
              <View style={[styles.fila, propio ? styles.filaPropia : styles.filaAjena]}>
                <View style={[styles.burbuja, propio ? styles.burbujaPropia : styles.burbujaAjena]}>
                  {item.imagenUrl ? <Image source={{ uri: item.imagenUrl }} style={styles.imagen} resizeMode="cover" accessibilityLabel="Foto que te mandó tu familiar" /> : null}
                  {item.audioUrl || item.audioDuracionSegundos ? (
                    <View style={styles.audioContainer}>
                      <Text style={styles.audioLabel}>🎤 Mensaje de voz · {formatearDuracion(item.audioDuracionSegundos ?? 0)}</Text>
                      <TouchableOpacity
                        style={[styles.audioBtn, reproduciendoId === item.id && styles.audioBtnActivo]}
                        onPress={() => void toggleReproducir(item)}
                        disabled={!item.audioUrl}
                        accessibilityRole="button"
                        accessibilityLabel={reproduciendoId === item.id ? 'Pausar mensaje de voz' : 'Escuchar mensaje de voz'}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={reproduciendoId === item.id ? 'pause' : 'volume-medium'} size={20} color={reproduciendoId === item.id ? Colors.speak.active : Colors.brand.primary} />
                        <Text style={[styles.audioBtnTexto, reproduciendoId === item.id && styles.audioBtnTextoActivo]}>{reproduciendoId === item.id ? 'Pausar' : 'Escuchar'}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {item.contenido ? <Text style={styles.texto} maxFontSizeMultiplier={1.4}>{item.contenido}</Text> : null}
                  <Text style={styles.hora}>{horaDe(item.creadoEn)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {responder.isError ? <Text style={styles.error}>No se pudo enviar. Probá de nuevo.</Text> : null}

      {responderAudio.isPending && !grabando ? (
        <View style={styles.enviandoBanner}>
          <ActivityIndicator size="small" color={Colors.hablemos.accent} />
          <Text style={styles.enviandoTexto}>Enviando tu mensaje de voz...</Text>
        </View>
      ) : null}

      {grabando ? (
        <View style={[styles.grabandoWrapper, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <View style={styles.grabandoTituloFila}>
            <View style={styles.puntoRojo} />
            <Text style={styles.grabandoTexto}>Grabando mensaje de voz...</Text>
          </View>
          <View style={styles.grabandoAccionesFila}>
            <TouchableOpacity style={[styles.grabandoAccionBtn, styles.grabandoBorrarBtn]} onPress={borrarGrabacion} accessibilityRole="button" accessibilityLabel="Borrar el mensaje de voz sin enviarlo" activeOpacity={0.75}>
              <Ionicons name="trash" size={28} color={Colors.brand.red} />
              <Text style={[styles.grabandoAccionTexto, { color: Colors.brand.red }]}>Borrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.grabandoAccionBtn, styles.grabandoEnviarBtn]} onPress={detenerYEnviarGrabacion} accessibilityRole="button" accessibilityLabel="Enviar el mensaje de voz" activeOpacity={0.75}>
              <Ionicons name="send" size={28} color={Colors.text.onDark} />
              <Text style={[styles.grabandoAccionTexto, { color: Colors.text.onDark }]}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribí tu respuesta…"
            placeholderTextColor={Colors.text.hint}
            multiline
            maxLength={2000}
            accessibilityLabel="Escribí tu respuesta"
          />
          {texto.trim().length > 0 ? (
            <TouchableOpacity
              style={[styles.enviar, !puedeEnviar && styles.enviarInactivo]}
              onPress={enviar}
              disabled={!puedeEnviar}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              accessibilityState={{ disabled: !puedeEnviar }}
            >
              {responder.isPending ? <ActivityIndicator color={Colors.text.onDark} /> : <Ionicons name="send" size={26} color={Colors.text.onDark} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.enviar, styles.mic]}
              onPress={iniciarGrabacion}
              disabled={responderAudio.isPending}
              accessibilityRole="button"
              accessibilityLabel="Grabar mensaje de voz"
            >
              <Ionicons name="mic" size={28} color={Colors.text.onDark} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  centro: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.section, paddingHorizontal: Spacing.xxxl },
  mensajes: { padding: Spacing.screen.horizontal, paddingBottom: Spacing.lg, flexGrow: 1 },
  fila: { flexDirection: 'row', marginBottom: Spacing.sm },
  filaPropia: { justifyContent: 'flex-end' },
  filaAjena: { justifyContent: 'flex-start' },
  burbuja: { maxWidth: '85%', borderRadius: Spacing.radius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, gap: 4 },
  burbujaPropia: { backgroundColor: Colors.hablemos.burbujaPropia },
  burbujaAjena: { backgroundColor: Colors.hablemos.burbujaAjena },
  texto: { fontSize: Typography.size.md, color: Colors.text.primary },
  imagen: { width: 220, height: 220, borderRadius: Spacing.radius.md },
  hora: { fontSize: Typography.size.xs, color: Colors.text.hint, alignSelf: 'flex-end' },
  vacioTexto: { fontSize: Typography.size.md, color: Colors.text.hint, textAlign: 'center' },
  error: { fontSize: Typography.size.sm, color: Colors.status.errorDark, textAlign: 'center', paddingVertical: Spacing.xs },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.ui.surface, borderTopWidth: 1, borderTopColor: Colors.ui.border },
  input: { flex: 1, minHeight: Spacing.touch.min, maxHeight: 140, fontSize: Typography.size.md, color: Colors.text.primary, backgroundColor: Colors.ui.background, borderRadius: Spacing.radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  enviar: { width: Spacing.touch.min, height: Spacing.touch.min, borderRadius: Spacing.touch.min / 2, backgroundColor: Colors.hablemos.accent, alignItems: 'center', justifyContent: 'center' },
  enviarInactivo: { backgroundColor: Colors.ui.disabled },
  mic: { backgroundColor: Colors.hablemos.accentDark },
  audioContainer: { gap: Spacing.sm, minWidth: 220 },
  audioLabel: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  audioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: Spacing.touch.min, borderRadius: Spacing.radius.lg, backgroundColor: '#E8F5E9' },
  audioBtnActivo: { backgroundColor: Colors.speak.activeBg },
  audioBtnTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  audioBtnTextoActivo: { color: Colors.speak.active },
  enviandoBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#E8F5E9', paddingHorizontal: Spacing.screen.horizontal, paddingVertical: Spacing.sm },
  enviandoTexto: { fontSize: Typography.size.md, color: Colors.hablemos.accentDark, fontWeight: Typography.weight.medium },
  grabandoWrapper: { backgroundColor: Colors.status.errorBg, paddingHorizontal: Spacing.screen.horizontal, paddingTop: Spacing.md, gap: Spacing.md, borderTopWidth: 1, borderTopColor: '#FFCDD2' },
  grabandoTituloFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  puntoRojo: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.brand.red },
  grabandoTexto: { flex: 1, fontSize: Typography.size.md, color: Colors.status.errorDark, fontWeight: Typography.weight.bold },
  grabandoAccionesFila: { flexDirection: 'row', gap: Spacing.xl },
  grabandoAccionBtn: { flex: 1, minHeight: Spacing.touch.large, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Spacing.radius.lg, paddingHorizontal: Spacing.md },
  grabandoBorrarBtn: { backgroundColor: Colors.ui.surface, borderWidth: 2, borderColor: Colors.brand.red },
  grabandoEnviarBtn: { backgroundColor: Colors.hablemos.accent },
  grabandoAccionTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  reintentar: { backgroundColor: Colors.hablemos.accent, borderRadius: Spacing.radius.xl, paddingHorizontal: Spacing.xl, minHeight: Spacing.touch.min, justifyContent: 'center' },
  reintentarTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
});
