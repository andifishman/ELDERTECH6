import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { AppHeader } from '@/components/common/AppHeader';
import { RadioCard } from '@/components/radio/RadioCard';
import { NowPlayingBar } from '@/components/radio/NowPlayingBar';
import { LoadingState, ErrorState } from '@/components/common/LoadingState';
import { useRadioData } from '@/hooks/useRadio';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { RadioStation } from '@/types/radio.types';

export default function RadioScreen() {
  const { data, isLoading, error, refetch } = useRadioData();
  const [paisFiltro, setPaisFiltro] = useState<string | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [categoriaIndex, setCategoriaIndex] = useState(0);
  const categoriaRef = useRef<FlatList>(null);

  const radiosFiltradas = useMemo<RadioStation[]>(() => {
    let result = data?.radios ?? [];
    if (paisFiltro) result = result.filter((r) => r.pais === paisFiltro);
    if (categoriaFiltro) result = result.filter((r) => r.categoriaId === categoriaFiltro);
    return result;
  }, [data, paisFiltro, categoriaFiltro]);

  const handleSeleccionarPais = (codigo: string | null) => {
    setPaisFiltro(codigo);
    setCategoriaFiltro(null); // reset categoria al cambiar país
  };

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Radio" mostrarVolver tituloGrande />
        <LoadingState mensaje="Cargando radios..." />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Radio" mostrarVolver tituloGrande />
        <ErrorState mensaje="No se pudieron cargar las radios." onReintentar={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header sin subtítulo, título grande */}
      <AppHeader
        titulo="Radio"
        mostrarVolver
        textoHablar="Radio. Tocá una radio para escucharla en vivo. Podés filtrar por país o por tipo de música."
      />

      {/* Selector de país */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <FilterChip
            label="Todas"
            emoji="🌐"
            activa={paisFiltro === null}
            color={Colors.brand.greenDark}
            onPress={() => handleSeleccionarPais(null)}
          />
          {data.paises.map((p) => (
            <FilterChip
              key={p.codigo}
              label={p.nombre}
              emoji={p.emojiBandera ?? ''}
              activa={paisFiltro === p.codigo}
              color={Colors.brand.greenDark}
              onPress={() => handleSeleccionarPais(p.codigo)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Carrusel de categorías */}
      <CategoriaCarrusel
        categorias={[
          { id: null, nombre: 'Todas', emoji: '📻' },
          ...data.categorias.map((c) => ({ id: c.id, nombre: c.nombre, emoji: c.emoji ?? '📻' })),
        ]}
        seleccionada={categoriaFiltro}
        indice={categoriaIndex}
        flatListRef={categoriaRef}
        onSeleccionar={(id, index) => {
          setCategoriaFiltro(id);
          setCategoriaIndex(index);
        }}
      />

      {/* Lista de radios */}
      {(() => {
        const categorias = [
          { id: null, nombre: 'Todas', emoji: '📻' },
          ...data.categorias.map((c) => ({ id: c.id, nombre: c.nombre, emoji: c.emoji ?? '📻' })),
        ];
        const catActual = categorias.find((c) => c.id === categoriaFiltro) ?? categorias[0];

        return (
          <FlatList
            data={radiosFiltradas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RadioCard radio={item} mostrarPais={paisFiltro === null} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.categoriaActualBanner}>
                <Text style={styles.categoriaActualEmoji}>{catActual.emoji}</Text>
                <Text style={styles.categoriaActualNombre}>{catActual.nombre}</Text>
                <Text style={styles.categoriaActualCount}>
                  {radiosFiltradas.length} {radiosFiltradas.length === 1 ? 'radio' : 'radios'}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📻</Text>
                <Text style={styles.emptyText}>No hay radios en esta categoría</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => { setPaisFiltro(null); setCategoriaFiltro(null); }}
                >
                  <Text style={styles.emptyBtnText}>Ver todas las radios</Text>
                </TouchableOpacity>
              </View>
            }
          />
        );
      })()}

      <NowPlayingBar />
    </View>
  );
}

// ─── Carrusel de categorías con flechas ──────────────────────────────────────

interface CategoriaItem {
  id: string | null;
  nombre: string;
  emoji: string;
}

interface CategoriaCarruselProps {
  categorias: CategoriaItem[];
  seleccionada: string | null;
  indice: number;
  flatListRef: React.RefObject<FlatList>;
  onSeleccionar: (id: string | null, index: number) => void;
}

function CategoriaCarrusel({
  categorias,
  seleccionada,
  indice,
  flatListRef,
  onSeleccionar,
}: CategoriaCarruselProps) {
  const ARROW_WIDTH = 44;
  const ARROW_GAP = 12; // separación entre flecha y lista
  const CHIP_GAP = 8;
  const [listaWidth, setListaWidth] = React.useState(0);

  // Ancho de cada chip: el espacio disponible dividido en 3, menos los gaps entre chips
  const CHIP_WIDTH = listaWidth > 0
    ? Math.floor((listaWidth - CHIP_GAP * 2) / 3)
    : 80;

  const irA = (nuevoIndice: number) => {
    const clamped = Math.max(0, Math.min(nuevoIndice, categorias.length - 1));
    const item = categorias[clamped];
    onSeleccionar(item.id, clamped);
    flatListRef.current?.scrollToIndex({ index: clamped, animated: true, viewPosition: 0.5 });
  };

  return (
    <View style={styles.carouselWrapper}>
      <View style={styles.carouselRow}>
        {/* Flecha izquierda */}
        <TouchableOpacity
          style={[styles.arrowBtn, indice === 0 && styles.arrowBtnDisabled]}
          onPress={() => irA(indice - 1)}
          disabled={indice === 0}
          accessibilityLabel="Categoría anterior"
          accessibilityRole="button"
        >
          <Text style={[styles.arrowText, indice === 0 && styles.arrowTextDisabled]}>‹</Text>
        </TouchableOpacity>

        {/* Lista — mide su propio ancho disponible */}
        <View
          style={styles.carouselListContainer}
          onLayout={(e) => setListaWidth(e.nativeEvent.layout.width)}
        >
          {listaWidth > 0 && (
            <FlatList
              ref={flatListRef}
              data={categorias}
              keyExtractor={(item) => item.id ?? '__todas__'}
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.carouselContent, { gap: CHIP_GAP }]}
              renderItem={({ item, index }) => {
                const activa = seleccionada === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.carouselChip,
                      { width: CHIP_WIDTH },
                      activa && styles.carouselChipActiva,
                    ]}
                    onPress={() => irA(index)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activa }}
                    accessibilityLabel={`Filtrar por ${item.nombre}`}
                  >
                    <Text style={styles.carouselEmoji}>{item.emoji}</Text>
                    <Text
                      style={[styles.carouselLabel, activa && styles.carouselLabelActiva]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {item.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Flecha derecha */}
        <TouchableOpacity
          style={[styles.arrowBtn, indice === categorias.length - 1 && styles.arrowBtnDisabled]}
          onPress={() => irA(indice + 1)}
          disabled={indice === categorias.length - 1}
          accessibilityLabel="Categoría siguiente"
          accessibilityRole="button"
        >
          <Text style={[styles.arrowText, indice === categorias.length - 1 && styles.arrowTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Indicadores de puntos */}
      <View style={styles.dotsRow}>
        {categorias.map((_, i) => (
          <View key={i} style={[styles.dot, indice === i && styles.dotActivo]} />
        ))}
      </View>
    </View>
  );
}

// ─── Chip de filtro de país ───────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  emoji: string;
  activa: boolean;
  color: string;
  onPress: () => void;
}

function FilterChip({ label, emoji, activa, color, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        activa && { backgroundColor: color, borderColor: color },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={`Filtrar por ${label}`}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipLabel, activa && styles.chipLabelActiva]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  filterBar: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    paddingVertical: Spacing.sm,
  },
  filterBarCategoria: {
    backgroundColor: '#F0F4FF',
  },
  carouselWrapper: {
    backgroundColor: '#F0F4FF',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  carouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen.horizontal,
    gap: 12,
  },
  carouselListContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  arrowBtn: {
    width: 44,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.radius.md,
    backgroundColor: Colors.brand.blueDark,
  },
  arrowBtnDisabled: {
    backgroundColor: Colors.ui.border,
  },
  arrowText: {
    fontSize: 34,
    lineHeight: 38,
    color: Colors.text.onDark,
    fontWeight: '700',
  },
  arrowTextDisabled: {
    color: Colors.text.hint,
  },
  carouselContent: {
    gap: 8,
  },
  carouselChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.ui.background,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    gap: 6,
    minHeight: 80,
  },
  carouselChipActiva: {
    backgroundColor: Colors.brand.blueDark,
    borderColor: Colors.brand.blueDark,
  },
  carouselEmoji: {
    fontSize: 30,
  },
  carouselLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  carouselLabelActiva: {
    color: Colors.text.onDark,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.ui.border,
  },
  dotActivo: {
    backgroundColor: Colors.brand.blueDark,
    width: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen.horizontal,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.background,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    minHeight: 38,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },
  chipLabelActiva: {
    color: Colors.text.onDark,
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  categoriaActualBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.screen.horizontal,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.brand.blueDark,
    borderRadius: Spacing.radius.lg,
  },
  categoriaActualEmoji: {
    fontSize: 22,
  },
  categoriaActualNombre: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    flex: 1,
  },
  categoriaActualCount: {
    fontSize: Typography.size.lg,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: Typography.weight.semibold,
  },
  contadorLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingBottom: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.section * 2,
    paddingHorizontal: Spacing.screen.horizontal,
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyText: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.brand.greenDark,
    borderRadius: Spacing.radius.full,
  },
  emptyBtnText: {
    fontSize: Typography.size.md,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.semibold,
  },
});
