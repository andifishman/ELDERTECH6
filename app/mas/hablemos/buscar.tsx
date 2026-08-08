// Hablemos — buscar un residente para iniciar una conversación nueva
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useBuscarResidentesHablemos, useIniciarConversacionHablemos } from '@/hooks/useHablemos';
import type { ResidenteBusqueda } from '@/services/hablemosService';

const DEBOUNCE_MS = 350;

export default function HablemosBuscarScreen() {
  const [texto, setTexto] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(texto.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [texto]);

  const { data: residentes, isLoading, isFetching } = useBuscarResidentesHablemos(busquedaDebounced);
  const iniciarConversacion = useIniciarConversacionHablemos();

  const seleccionar = async (residente: ResidenteBusqueda) => {
    try {
      const conversacion = await iniciarConversacion.mutateAsync(residente.id);
      router.replace(`/mas/hablemos/${conversacion.id}` as never);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar la conversación.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Nueva conversación"
        mostrarVolver
        backgroundColor={Colors.hablemos.accent}
        textoHablar="Nueva conversación. Buscá al residente con el que querés hablar."
      />

      <View style={styles.buscadorContainer}>
        <Ionicons name="search" size={22} color={Colors.text.hint} />
        <TextInput
          style={styles.buscadorInput}
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribí un nombre o apellido..."
          placeholderTextColor={Colors.text.hint}
          autoFocus
          accessibilityLabel="Buscar residente por nombre"
        />
      </View>

      {isLoading || isFetching ? (
        <ActivityIndicator color={Colors.hablemos.accent} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <FlatList
          data={residentes ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.vacioContainer}>
              <Text style={styles.vacioEmoji}>🔎</Text>
              <Text style={styles.vacioTexto}>
                {busquedaDebounced.length === 0
                  ? 'Todavía no hay otros residentes disponibles.'
                  : 'No se encontró ningún residente con ese nombre.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.residenteCard}
              onPress={() => seleccionar(item)}
              disabled={iniciarConversacion.isPending}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Empezar a hablar con ${item.nombre} ${item.apellido}`}
            >
              {item.foto_url ? (
                <Image source={{ uri: item.foto_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInicial}>{item.nombre.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.nombreTexto}>{item.nombre} {item.apellido}</Text>
              {iniciarConversacion.isPending ? (
                <ActivityIndicator color={Colors.hablemos.accent} />
              ) : (
                // Botón con texto en vez del ícono chico de globo de chat — más
                // claro para el residente que ahí se toca para escribirle.
                <View style={styles.escribirPill}>
                  <Ionicons name="create-outline" size={20} color={Colors.text.onDark} />
                  <Text style={styles.escribirPillTexto}>Escribir</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  buscadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.ui.surface,
    marginHorizontal: Spacing.screen.horizontal,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.radius.xl,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    minHeight: Spacing.touch.min,
  },
  buscadorInput: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    paddingVertical: Spacing.sm,
  },
  lista: { paddingHorizontal: Spacing.screen.horizontal, paddingBottom: Spacing.xxxl },
  residenteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: Spacing.touch.comfortable + Spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.ui.background },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.hablemos.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInicial: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  nombreTexto: { flex: 1, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  // Reemplaza el ícono chico de "globo de chat": un botón con texto se
  // entiende sin ambigüedad como "tocá acá para escribirle a esta persona".
  escribirPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: Spacing.touch.min,
    backgroundColor: Colors.hablemos.accent,
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    flexShrink: 0,
  },
  escribirPillTexto: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  vacioContainer: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.section, paddingHorizontal: Spacing.xxxl },
  vacioEmoji: { fontSize: 56 },
  vacioTexto: { fontSize: Typography.size.md, color: Colors.text.hint, textAlign: 'center' },
});
