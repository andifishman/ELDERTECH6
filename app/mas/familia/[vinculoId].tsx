// Mi familia — conversación con un familiar
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useConversacionesFamilia, useMensajesFamilia, useResponderFamilia } from '@/hooks/useMiFamilia';
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
  const [texto, setTexto] = useState('');
  const lista = useRef<FlatList<MensajeFamilia>>(null);

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
      <AppHeader titulo={nombre} mostrarVolver backgroundColor={Colors.hablemos.accent} textoHablar={`Conversación con ${nombre}.`} />

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
                  {item.contenido ? <Text style={styles.texto} maxFontSizeMultiplier={1.4}>{item.contenido}</Text> : null}
                  <Text style={styles.hora}>{horaDe(item.creadoEn)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {responder.isError ? <Text style={styles.error}>No se pudo enviar. Probá de nuevo.</Text> : null}

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
      </View>
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
  reintentar: { backgroundColor: Colors.hablemos.accent, borderRadius: Spacing.radius.xl, paddingHorizontal: Spacing.xl, minHeight: Spacing.touch.min, justifyContent: 'center' },
  reintentarTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
});
