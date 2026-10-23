// Novedades — detalle de una noticia: foto grande (si tiene), título, fecha y
// el texto completo con letra grande. Al abrirla se marca como leída, así
// deja de mostrar el cartel "Nueva" en la lista y en la Home.
import React, { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState, LoadingState } from '@/components/common/LoadingState';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useMarcarNovedadLeida, useNovedades } from '@/hooks/useNovedades';
import { CATEGORIAS_NOVEDAD, fechaDeEvento, fechaDePublicacion } from '@/utils/novedades';

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
        {novedad.imagen_url ? <Image source={{ uri: novedad.imagen_url }} style={styles.foto} resizeMode="cover" /> : null}
        <View style={styles.cuerpo}>
          {(novedad.categoria ?? 'general') !== 'general' || novedad.fijada ? (
            <Text style={styles.categoria}>
              {novedad.fijada ? '📌 Importante' : ''}
              {novedad.fijada && (novedad.categoria ?? 'general') !== 'general' ? '  ·  ' : ''}
              {(novedad.categoria ?? 'general') !== 'general' ? `${CATEGORIAS_NOVEDAD[novedad.categoria].emoji} ${CATEGORIAS_NOVEDAD[novedad.categoria].nombre}` : ''}
            </Text>
          ) : null}
          <Text style={styles.titulo}>{novedad.titulo}</Text>
          {novedad.fecha_evento ? <Text style={styles.fechaEvento}>🗓️ {fechaDeEvento(novedad.fecha_evento)}</Text> : null}
          <Text style={styles.fecha}>{fechaDePublicacion(novedad.publicar_en ?? novedad.created_at)}</Text>
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
  fechaEvento: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  titulo: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold, color: Colors.text.primary, lineHeight: 40 },
  fecha: { fontSize: Typography.size.md, color: Colors.text.hint },
  texto: { fontSize: Typography.size.lg, color: Colors.text.primary, lineHeight: 32, marginTop: Spacing.sm },
});
