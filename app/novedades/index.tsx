// Novedades — lista de noticias de la residencia que publica el personal desde
// el backoffice. Cada tarjeta muestra la foto (si tiene), el título, la fecha y
// hora del evento (con cartel "¡HOY!" si es hoy) y un cartel "Nueva" hasta que el residente la abre.
import React, { useMemo, useState } from 'react';
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
import { CATEGORIAS_NOVEDAD, eventoEsHoy, fechaDeEvento } from '@/utils/novedades';

const LINEA_RESUMEN = 26;

/** Por fecha del evento, de la más cercana a la más lejana (sin fecha, al final). */
function ordenarNovedades(lista: Novedad[]): Novedad[] {
  const t = (n: Novedad) => (n.fecha_evento ? new Date(n.fecha_evento).getTime() : Number.POSITIVE_INFINITY);
  return [...lista].sort((a, b) => t(a) - t(b));
}

export default function NovedadesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, isFetching, refetch } = useNovedades();
  const novedades = useMemo(() => ordenarNovedades(data ?? []), [data]);
  const sinLeer = novedades.filter((n) => !n.leida).length;

  const textoHablar =
    novedades.length === 0
      ? 'Novedades. Por ahora no hay novedades de la residencia.'
      : `Novedades. Hay ${novedades.length} ${novedades.length === 1 ? 'novedad' : 'novedades'}${
          sinLeer > 0 ? `, ${sinLeer} sin leer` : ''
        }. ${novedades.map((n) => n.titulo).join('. ')}. Tocá una para leerla completa.`;

  return (
    <View style={styles.root}>
      <AppHeader titulo="Novedades" mostrarVolver textoHablar={textoHablar} />

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
  // Con un backend que todavía no manda los campos nuevos, se ve como una novedad común.
  const categoria = novedad.categoria ?? 'general';
  const [cortado, setCortado] = useState(false);
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
        <View style={styles.carteles}>
          {!novedad.leida && (
            <View style={styles.cartelNueva}>
              <Text style={styles.cartelNuevaTexto}>Nueva</Text>
            </View>
          )}
          {categoria !== 'general' && (
            <View style={styles.cartelCategoria}>
              <Text style={styles.cartelCategoriaTexto}>
                {CATEGORIAS_NOVEDAD[categoria].emoji} {CATEGORIAS_NOVEDAD[categoria].nombre}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.titulo}>{novedad.titulo}</Text>
        {novedad.fecha_evento ? (
          <View style={styles.fechaFila}>
            <Text style={styles.fechaEvento}>🗓️ {fechaDeEvento(novedad.fecha_evento)}</Text>
            {eventoEsHoy(novedad.fecha_evento) && (
              <View style={styles.cartelHoy}>
                <Text style={styles.cartelHoyTexto}>¡HOY!</Text>
              </View>
            )}
          </View>
        ) : null}
        <View>
          <Text style={styles.resumen} numberOfLines={2}>
            {novedad.texto}
          </Text>
          {/* Copia invisible sin límite de renglones, solo para medir si el texto completo no entra en 2 */}
          <Text
            style={[styles.resumen, styles.medidor]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={(e) => setCortado(e.nativeEvent.layout.height > LINEA_RESUMEN * 2 + 1)}
          >
            {novedad.texto}
          </Text>
        </View>
        {/* El botón "Ver más" va debajo de la descripción, y solo si el texto pasa de 2 renglones */}
        {cortado && (
          <TouchableOpacity
            style={styles.verMas}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Ver más de ${novedad.titulo}`}
          >
            <Text style={styles.verMasTexto}>Ver más</Text>
          </TouchableOpacity>
        )}
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
  carteles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.xs },
  cartelNueva: {
    backgroundColor: Colors.hablemos.noLeidosBadge,
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  cartelCategoria: { backgroundColor: '#E9E2F2', borderRadius: Spacing.radius.full, paddingHorizontal: Spacing.md, paddingVertical: 2 },
  cartelCategoriaTexto: { color: Colors.brand.primary, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  fechaFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  fechaEvento: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  cartelHoy: { backgroundColor: Colors.brand.red, borderRadius: Spacing.radius.full, paddingHorizontal: Spacing.md, paddingVertical: 2 },
  cartelHoyTexto: { color: Colors.text.onDark, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  verMas: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: Colors.brand.primary,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: Spacing.xl,
    marginVertical: Spacing.xs,
  },
  verMasTexto: { color: '#FFFFFF', fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  medidor: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  cartelNuevaTexto: { color: Colors.text.onDark, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  titulo: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  resumen: { fontSize: Typography.size.md, color: Colors.text.primary, lineHeight: LINEA_RESUMEN },
  vacio: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.section, paddingHorizontal: Spacing.xl },
  vacioEmoji: { fontSize: 56 },
  vacioTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary, textAlign: 'center' },
  vacioSubtexto: { fontSize: Typography.size.md, color: Colors.text.primary, textAlign: 'center', lineHeight: 26 },
});
