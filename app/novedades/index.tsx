// Novedades — lista de noticias de la residencia que publica el personal desde
// el backoffice. Cada tarjeta muestra la foto (si tiene), el título, cuándo se
// publicó y un cartel "Nueva" hasta que el residente la abre.
import React from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState, LoadingState } from '@/components/common/LoadingState';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useNovedades } from '@/hooks/useNovedades';
import type { Novedad } from '@/services/novedadesService';
import { fechaDePublicacion } from '@/utils/novedades';

export default function NovedadesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, isFetching, refetch } = useNovedades();
  const novedades = data ?? [];
  const sinLeer = novedades.filter((n) => !n.leida).length;

  const textoHablar =
    novedades.length === 0
      ? 'Novedades. Por ahora no hay novedades de la residencia.'
      : `Novedades. Hay ${novedades.length} ${novedades.length === 1 ? 'novedad' : 'novedades'}${
          sinLeer > 0 ? `, ${sinLeer} sin leer` : ''
        }. ${novedades.map((n) => n.titulo).join('. ')}. Tocá una para leerla completa.`;

  return (
    <View style={styles.root}>
      <AppHeader titulo="Novedades" subtitulo="Noticias de la residencia" mostrarVolver textoHablar={textoHablar} />

      {isLoading ? (
        <LoadingState mensaje="Cargando novedades..." />
      ) : isError ? (
        <ErrorState mensaje="No se pudieron cargar las novedades. Probá de nuevo en un rato." />
      ) : (
        <FlatList
          data={novedades}
          keyExtractor={(n) => n.id}
          contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              colors={[Colors.brand.primary]}
              tintColor={Colors.brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.vacioEmoji}>📰</Text>
              <Text style={styles.vacioTexto}>Por ahora no hay novedades.</Text>
              <Text style={styles.vacioSubtexto}>Cuando el personal publique una noticia, la vas a ver acá.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TarjetaNovedad novedad={item} onPress={() => router.push({ pathname: '/novedades/[id]', params: { id: item.id } } as never)} />
          )}
        />
      )}
    </View>
  );
}

function TarjetaNovedad({ novedad, onPress }: { novedad: Novedad; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tarjeta, !novedad.leida && styles.tarjetaNueva]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${novedad.leida ? '' : 'Nueva. '}${novedad.titulo}. Tocá para leerla.`}
    >
      {novedad.imagen_url ? <Image source={{ uri: novedad.imagen_url }} style={styles.foto} resizeMode="cover" /> : null}
      <View style={styles.cuerpo}>
        {!novedad.leida && (
          <View style={styles.cartelNueva}>
            <Text style={styles.cartelNuevaTexto}>Nueva</Text>
          </View>
        )}
        <Text style={styles.titulo}>{novedad.titulo}</Text>
        <Text style={styles.resumen} numberOfLines={2}>
          {novedad.texto}
        </Text>
        <Text style={styles.fecha}>{fechaDePublicacion(novedad.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  lista: { padding: Spacing.screen.horizontal, gap: Spacing.md },
  tarjeta: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    overflow: 'hidden',
  },
  tarjetaNueva: { borderColor: Colors.brand.primary },
  foto: { width: '100%', aspectRatio: 16 / 9, backgroundColor: Colors.ui.border },
  cuerpo: { padding: Spacing.card.horizontal, gap: Spacing.xs },
  cartelNueva: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.hablemos.noLeidosBadge,
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  cartelNuevaTexto: { color: Colors.text.onDark, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  titulo: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  resumen: { fontSize: Typography.size.md, color: Colors.text.primary, lineHeight: 26 },
  fecha: { fontSize: Typography.size.sm, color: Colors.text.hint, marginTop: Spacing.xs },
  vacio: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.section, paddingHorizontal: Spacing.xl },
  vacioEmoji: { fontSize: 56 },
  vacioTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, textAlign: 'center' },
  vacioSubtexto: { fontSize: Typography.size.md, color: Colors.text.primary, textAlign: 'center', lineHeight: 26 },
});
