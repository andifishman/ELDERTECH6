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
import { useConversacionesFamilia } from '@/hooks/useMiFamilia';
import { formatFechaListaConversaciones } from '@/utils/dateUtils';
import { coincideBusqueda } from '@/utils/textSearch';
import { nombreParaMostrar, type ConversacionHablemos } from '@/services/hablemosService';
import type { ConversacionFamilia } from '@/services/miFamiliaService';

// La lista mezcla conversaciones con otros residentes y con familiares (las de
// familia llevan la etiqueta "Familia" y abren la pantalla de Mi familia).
interface ItemLista {
  clave: string;
  ruta: string;
  esFamilia: boolean;
  nombre: string;
  fotoUrl: string | null;
  preview: string;
  fechaIso: string | null;
  noLeidos: number;
}

function itemDeHablemos(c: ConversacionHablemos): ItemLista {
  return {
    clave: `h-${c.id}`,
    ruta: `/mas/hablemos/${c.id}`,
    esFamilia: false,
    nombre: nombreCompleto(c),
    fotoUrl: c.otroParticipante?.foto_url ?? null,
    preview: previewMensaje(c),
    fechaIso: c.ultimo_mensaje_at,
    noLeidos: c.noLeidosCount,
  };
}

function itemDeFamilia(c: ConversacionFamilia): ItemLista {
  return {
    clave: `f-${c.vinculoId}`,
    ruta: `/mas/familia/${c.vinculoId}`,
    esFamilia: true,
    nombre: c.parentesco ? `${c.familiar} (${c.parentesco})` : c.familiar,
    fotoUrl: null,
    preview: c.ultimoMensaje?.vistaPrevia ?? 'Todavía no hay mensajes',
    fechaIso: c.ultimoMensaje?.creadoEn ?? null,
    noLeidos: c.sinLeer,
  };
}

function nombreCompleto(conversacion: ConversacionHablemos): string {
  const otro = conversacion.otroParticipante;
  if (!otro) return 'Residente';
  return nombreParaMostrar(otro);
}

function previewMensaje(conversacion: ConversacionHablemos): string {
  if (!conversacion.ultimo_mensaje_preview) return 'Todavía no hay mensajes';
  return conversacion.ultimo_mensaje_preview;
}

export default function HablemosListaScreen() {
  const { data: conversaciones, isLoading } = useConversacionesHablemos();
  useConversacionesRealtime(true);
  // Si "Mi familia" falla (o el residente no tiene familiares vinculados) la lista sigue mostrando Hablemos normal.
  const { data: conversacionesFamilia, isLoading: cargandoFamilia } = useConversacionesFamilia();
  const [busqueda, setBusqueda] = useState('');

  const conversacionesFiltradas = useMemo(() => {
    const items = [...(conversaciones ?? []).map(itemDeHablemos), ...(conversacionesFamilia ?? []).map(itemDeFamilia)];
    items.sort((a, b) => (b.fechaIso ? Date.parse(b.fechaIso) : 0) - (a.fechaIso ? Date.parse(a.fechaIso) : 0));
    if (!busqueda.trim()) return items;
    return items.filter((i) => coincideBusqueda(i.nombre, busqueda) || (i.esFamilia && coincideBusqueda('familia', busqueda)));
  }, [conversaciones, conversacionesFamilia, busqueda]);

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Hablemos"
        mostrarVolver
        backgroundColor={Colors.hablemos.accent}
        textoHablar="Hablemos. Mandá mensajes de texto o de voz a otros residentes y a tu familia."
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

      {isLoading || (cargandoFamilia && !conversacionesFamilia) ? (
        <ActivityIndicator color={Colors.hablemos.accent} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <FlatList
          data={conversacionesFiltradas}
          keyExtractor={(item) => item.clave}
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
              onPress={() => router.push(item.ruta as never)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${item.esFamilia ? 'Conversación con tu familiar' : 'Conversación con'} ${item.nombre}${item.noLeidos > 0 ? `, ${item.noLeidos} sin leer` : ''}`}
            >
              {item.fotoUrl ? (
                <Image source={{ uri: item.fotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, item.esFamilia && styles.avatarFamilia]}>
                  <Text style={styles.avatarInicial}>{item.nombre.charAt(0).toUpperCase()}</Text>
                </View>
              )}

              <View style={styles.infoContainer}>
                <Text style={styles.nombreTexto} numberOfLines={1} maxFontSizeMultiplier={1.3}>{item.nombre}</Text>
                {item.esFamilia && (
                  <View style={styles.etiquetaFamilia}>
                    <Text style={styles.etiquetaFamiliaTexto} maxFontSizeMultiplier={1.3}>👪 Familia</Text>
                  </View>
                )}
                <Text
                  style={[styles.previewTexto, item.noLeidos > 0 && styles.previewTextoNoLeido]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {item.preview}
                </Text>
              </View>

              <View style={styles.metaContainer}>
                {item.fechaIso && (
                  <Text style={styles.horaTexto} maxFontSizeMultiplier={1.3}>{formatFechaListaConversaciones(item.fechaIso)}</Text>
                )}
                {item.noLeidos > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTexto}>{item.noLeidos > 99 ? '99+' : item.noLeidos}</Text>
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
    overflow: 'visible',
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
  avatarFamilia: { backgroundColor: Colors.hablemos.accentDark },
  etiquetaFamilia: { alignSelf: 'flex-start', backgroundColor: '#EDE7F6', borderRadius: Spacing.radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  etiquetaFamiliaTexto: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.hablemos.accentDark },
  avatarInicial: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  infoContainer: { flex: 1, gap: 2, overflow: 'visible' },
  // paddingRight: colchón contra el recorte del último carácter con "Texto en
  // negrita" del sistema activado (Ajustes > Accesibilidad) — Android dibuja
  // el texto más ancho de lo que React Native midió al calcular dónde cortar
  // con numberOfLines={1}, así que el corte real queda un poco antes de
  // donde debería. Este margen le da aire a ese cálculo.
  nombreTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary, paddingRight: 10 },
  previewTexto: { fontSize: Typography.size.sm, color: Colors.text.hint, paddingRight: 10 },
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
