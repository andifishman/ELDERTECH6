// Novedades — detalle de una noticia: foto grande (si tiene), título, fecha y
// el texto completo con letra grande. Al abrirla se marca como leída, así
// deja de mostrar el cartel "Nueva" en la lista y en la Home.
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { FotoCompleta } from '@/components/common/FotoCompleta';
import { ErrorState, LoadingState } from '@/components/common/LoadingState';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useMarcarNovedadLeida, useNovedades } from '@/hooks/useNovedades';
import { CATEGORIAS_NOVEDAD, eventoEsHoy, fechaDeEvento } from '@/utils/novedades';

export default function NovedadDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError } = useNovedades();
  const marcarLeida = useMarcarNovedadLeida();
  const novedad = data?.find((n) => n.id === id);

  const { mutate: marcar } = marcarLeida;
  const yaLeida = novedad?.leida ?? true;
  useEffect(() => {
    if (id && !yaLeida) marcar(id);
  }, [id, yaLeida, marcar]);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Novedad" mostrarVolver mostrarHablar={false} />
        <LoadingState mensaje="Cargando novedad..." />
      </View>
    );
  }

  if (isError || !novedad) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Novedad" mostrarVolver mostrarHablar={false} />
        <ErrorState mensaje="No encontramos esta novedad. Puede que ya no esté publicada." />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader titulo="Novedad" mostrarVolver textoHablar={`${novedad.titulo}. ${novedad.texto}`} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxxl }]}>
        {novedad.imagen_url ? <FotoCompleta uri={novedad.imagen_url} style={styles.foto} /> : null}
        <View style={styles.cuerpo}>
          {(novedad.categoria ?? 'general') !== 'general' ? (
            <Text style={styles.categoria}>
              {CATEGORIAS_NOVEDAD[novedad.categoria].emoji} {CATEGORIAS_NOVEDAD[novedad.categoria].nombre}
            </Text>
          ) : null}
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
          <Text style={styles.texto}>{novedad.texto}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  scroll: { flexGrow: 1 },
  foto: { width: '100%', aspectRatio: 4 / 3, backgroundColor: Colors.ui.border },
  cuerpo: { padding: Spacing.xl, gap: Spacing.sm },
  categoria: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  fechaFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  fechaEvento: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  cartelHoy: { backgroundColor: Colors.brand.red, borderRadius: Spacing.radius.full, paddingHorizontal: Spacing.md, paddingVertical: 2 },
  cartelHoyTexto: { color: Colors.text.onDark, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  titulo: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary, lineHeight: 40 },
  texto: { fontSize: Typography.size.lg, color: Colors.text.primary, lineHeight: 32, marginTop: Spacing.sm },
});
