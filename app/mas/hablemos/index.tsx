// Hablemos — lista de conversaciones
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useConversacionesHablemos } from '@/hooks/useHablemos';
import { useConversacionesRealtime } from '@/hooks/useHablemosRealtime';
import { formatFechaListaConversaciones } from '@/utils/dateUtils';
import type { ConversacionHablemos } from '@/services/hablemosService';

function nombreCompleto(conversacion: ConversacionHablemos): string {
  const otro = conversacion.otroParticipante;
  if (!otro) return 'Residente';
  return `${otro.nombre} ${otro.apellido}`;
}

function previewMensaje(conversacion: ConversacionHablemos): string {
  if (!conversacion.ultimo_mensaje_preview) return 'Todavía no hay mensajes';
  return conversacion.ultimo_mensaje_preview;
}

export default function HablemosListaScreen() {
  const { data: conversaciones, isLoading } = useConversacionesHablemos();
  useConversacionesRealtime(true);
  const [busqueda, setBusqueda] = useState('');

  const conversacionesFiltradas = useMemo(() => {
    if (!conversaciones) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return conversaciones;
    return conversaciones.filter((c) => nombreCompleto(c).toLowerCase().includes(texto));
  }, [conversaciones, busqueda]);

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Hablemos"
        mostrarVolver
        backgroundColor={Colors.hablemos.accent}
        textoHablar="Hablemos. Mandá mensajes de texto o de voz a otros residentes."
      />

      <View style={styles.buscadorContainer}>
        <Ionicons name="search" size={22} color={Colors.text.hint} />
        <TextInput
          style={styles.buscadorInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar conversación..."
          placeholderTextColor={Colors.text.hint}
          accessibilityLabel="Buscar conversación"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.hablemos.accent} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <FlatList
          data={conversacionesFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.vacioContainer}>
              <Text style={styles.vacioEmoji}>💬</Text>
              <Text style={styles.vacioTexto}>
                {busqueda ? 'No se encontró ninguna conversación.' : 'Todavía no tenés conversaciones. Tocá el botón de abajo para empezar una.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversacionCard}
              onPress={() => router.push(`/mas/hablemos/${item.id}` as never)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Conversación con ${nombreCompleto(item)}`}
            >
              {item.otroParticipante?.foto_url ? (
                <Image source={{ uri: item.otroParticipante.foto_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInicial}>{nombreCompleto(item).charAt(0).toUpperCase()}</Text>
                </View>
              )}

              <View style={styles.infoContainer}>
                <Text style={styles.nombreTexto} numberOfLines={1}>{nombreCompleto(item)}</Text>
                <Text style={[styles.previewTexto, item.noLeidosCount > 0 && styles.previewTextoNoLeido]} numberOfLines={1}>
                  {previewMensaje(item)}
                </Text>
              </View>

              <View style={styles.metaContainer}>
                {item.ultimo_mensaje_at && (
                  <Text style={styles.horaTexto}>{formatFechaListaConversaciones(item.ultimo_mensaje_at)}</Text>
                )}
                {item.noLeidosCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTexto}>{item.noLeidosCount > 99 ? '99+' : item.noLeidosCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/mas/hablemos/buscar' as never)}
        accessibilityRole="button"
        accessibilityLabel="Nueva conversación"
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.text.onDark} />
        <Text style={styles.fabTexto}>Nueva conversación</Text>
      </TouchableOpacity>
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
  lista: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingBottom: Spacing.section + Spacing.touch.comfortable,
  },
  conversacionCard: {
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
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.ui.background },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.hablemos.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInicial: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  infoContainer: { flex: 1, gap: 2 },
  nombreTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  previewTexto: { fontSize: Typography.size.sm, color: Colors.text.hint },
  previewTextoNoLeido: { color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  metaContainer: { alignItems: 'flex-end', gap: Spacing.xs },
  horaTexto: { fontSize: Typography.size.xs, color: Colors.text.hint },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: Colors.hablemos.noLeidosBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTexto: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  vacioContainer: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.section, paddingHorizontal: Spacing.xxxl },
  vacioEmoji: { fontSize: 56 },
  vacioTexto: { fontSize: Typography.size.md, color: Colors.text.hint, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.screen.horizontal,
    right: Spacing.screen.horizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.hablemos.accentDark,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
});
