import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
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
  const [idiomaFiltro, setIdiomaFiltro] = useState<string | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  const radiosFiltradas = useMemo<RadioStation[]>(() => {
    let result = data?.radios ?? [];
    if (idiomaFiltro) result = result.filter((r) => r.pais === idiomaFiltro);
    if (categoriaFiltro) result = result.filter((r) => r.categoriaId === categoriaFiltro);
    return result;
  }, [data, idiomaFiltro, categoriaFiltro]);

  const handleSeleccionarIdioma = (codigo: string | null) => {
    setIdiomaFiltro(codigo);
    setCategoriaFiltro(null);
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

  const idiomas = [
    { codigo: null,  nombre: 'Todas',  emoji: '🌐' },
    ...data.paises.map((p) => ({ codigo: p.codigo, nombre: p.nombre, emoji: p.emojiBandera ?? '🌐' })),
  ];

  const categorias = [
    { id: null, nombre: 'Todas', emoji: '📻' },
    ...data.categorias.map((c) => ({ id: c.id, nombre: c.nombre, emoji: c.emoji ?? '📻' })),
  ];

  const catActual = categorias.find((c) => c.id === categoriaFiltro) ?? categorias[0];

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Radio"
        mostrarVolver
        textoHablar="Radio. Tocá una radio para escucharla en vivo. Deslizá los filtros para cambiar de idioma o tipo de música."
      />

      {/* ── Filtro de idioma ─────────────────────────────────── */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Idioma</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          decelerationRate="fast"
        >
          {idiomas.map((idioma) => (
            <IdiomaChip
              key={idioma.codigo ?? '__todas__'}
              emoji={idioma.emoji}
              label={idioma.nombre}
              activa={idiomaFiltro === idioma.codigo}
              onPress={() => handleSeleccionarIdioma(idioma.codigo)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Filtro de categoría (scroll libre, sin flechas) ──── */}
      <View style={styles.categoriaSection}>
        <Text style={styles.filterLabel}>Categoría</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriaChipsRow}
          decelerationRate="fast"
        >
          {categorias.map((cat) => (
            <CategoriaChip
              key={cat.id ?? '__todas__'}
              emoji={cat.emoji}
              label={cat.nombre}
              activa={categoriaFiltro === cat.id}
              onPress={() => setCategoriaFiltro(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Lista de radios ───────────────────────────────────── */}
      <FlatList
        data={radiosFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RadioCard radio={item} mostrarPais={idiomaFiltro === null} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.resultadosBanner}>
            <Text style={styles.resultadosEmoji}>{catActual.emoji}</Text>
            <Text style={styles.resultadosNombre}>{catActual.nombre}</Text>
            <Text style={styles.resultadosCount}>
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
              onPress={() => { setIdiomaFiltro(null); setCategoriaFiltro(null); }}
              accessibilityRole="button"
              accessibilityLabel="Ver todas las radios"
            >
              <Text style={styles.emptyBtnText}>Ver todas las radios</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <NowPlayingBar />
    </View>
  );
}

// ─── Chip de idioma ───────────────────────────────────────────────────────────

interface IdiomaChipProps {
  emoji: string;
  label: string;
  activa: boolean;
  onPress: () => void;
}

function IdiomaChip({ emoji, label, activa, onPress }: IdiomaChipProps) {
  return (
    <TouchableOpacity
      style={[styles.idiomaChip, activa && styles.idiomaChipActiva]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={`Filtrar por ${label}`}
    >
      <Text style={styles.idiomaEmoji}>{emoji}</Text>
      <Text style={[styles.idiomaLabel, activa && styles.idiomaLabelActiva]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Chip de categoría ────────────────────────────────────────────────────────

interface CategoriaChipProps {
  emoji: string;
  label: string;
  activa: boolean;
  onPress: () => void;
}

function CategoriaChip({ emoji, label, activa, onPress }: CategoriaChipProps) {
  return (
    <TouchableOpacity
      style={[styles.categoriaChip, activa && styles.categoriaChipActiva]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={`Categoría ${label}`}
    >
      <Text style={styles.categoriaEmoji}>{emoji}</Text>
      <Text
        style={[styles.categoriaLabel, activa && styles.categoriaLabelActiva]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },

  // ── Secciones de filtro
  filterSection: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  categoriaSection: {
    backgroundColor: '#F0F4FF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.hint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.screen.horizontal,
  },

  // ── Idioma chips
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen.horizontal,
  },
  idiomaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.background,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    minHeight: 48,
  },
  idiomaChipActiva: {
    backgroundColor: Colors.brand.greenDark,
    borderColor: Colors.brand.greenDark,
  },
  idiomaEmoji: {
    fontSize: 18,
  },
  idiomaLabel: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },
  idiomaLabelActiva: {
    color: Colors.text.onDark,
  },

  // ── Categoría chips (más grandes, swipe libre)
  categoriaChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screen.horizontal,
  },
  categoriaChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.ui.background,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    gap: 6,
    minHeight: 72,
    minWidth: 72,
  },
  categoriaChipActiva: {
    backgroundColor: Colors.brand.blueDark,
    borderColor: Colors.brand.blueDark,
  },
  categoriaEmoji: {
    fontSize: 26,
  },
  categoriaLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.secondary,
    textAlign: 'center',
    maxWidth: 72,
  },
  categoriaLabelActiva: {
    color: Colors.text.onDark,
  },

  // ── Resultados banner
  resultadosBanner: {
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
  resultadosEmoji: {
    fontSize: 22,
  },
  resultadosNombre: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    flex: 1,
  },
  resultadosCount: {
    fontSize: Typography.size.md,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: Typography.weight.semibold,
  },

  // ── Lista
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },

  // ── Estado vacío
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
    minHeight: 48,
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontSize: Typography.size.md,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.semibold,
  },
});
