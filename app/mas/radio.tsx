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
  const [paisFiltro, setPaisFiltro] = useState<string | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

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
        <AppHeader titulo="Radio" subtitulo="Escuchá radios en vivo" mostrarVolver />
        <LoadingState mensaje="Cargando radios..." />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Radio" subtitulo="Escuchá radios en vivo" mostrarVolver />
        <ErrorState mensaje="No se pudieron cargar las radios." onReintentar={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Radio"
        subtitulo="Escuchá radios en vivo"
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

      {/* Selector de categoría */}
      <View style={[styles.filterBar, styles.filterBarCategoria]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <FilterChip
            label="Todas"
            emoji="📻"
            activa={categoriaFiltro === null}
            color={Colors.brand.blueDark}
            onPress={() => setCategoriaFiltro(null)}
          />
          {data.categorias.map((c) => (
            <FilterChip
              key={c.id}
              label={c.nombre}
              emoji={c.emoji ?? '📻'}
              activa={categoriaFiltro === c.id}
              color={Colors.brand.blueDark}
              onPress={() => setCategoriaFiltro(c.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Lista de radios */}
      <FlatList
        data={radiosFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RadioCard radio={item} mostrarPais={paisFiltro === null} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          radiosFiltradas.length > 0 ? (
            <Text style={styles.contadorLabel}>
              {radiosFiltradas.length} {radiosFiltradas.length === 1 ? 'radio' : 'radios'}
            </Text>
          ) : null
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

      <NowPlayingBar />
    </View>
  );
}

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
