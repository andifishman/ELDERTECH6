// Pantalla principal de Tutoriales — categorías, buscador y lista
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { TutorialCard } from '@/components/tutoriales/TutorialCard';
import { useAuth } from '@/context/AuthContext';
import { useCategoriasTutorial, useTutoriales } from '@/hooks/useTutoriales';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { TutorialConProgreso, CategoriaTutorial } from '@/types/database.types';

export default function TutorialesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const { data: categorias = [] } = useCategoriasTutorial();
  const { data: tutoriales = [], isLoading, isError, refetch } = useTutoriales(
    residenteId,
    categoriaSeleccionada,
  );

  // Filtrado local por búsqueda
  const tutorialesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return tutoriales;
    const q = busqueda.toLowerCase().trim();
    return tutoriales.filter(
      (t) =>
        t.titulo.toLowerCase().includes(q) ||
        t.descripcion?.toLowerCase().includes(q) ||
        t.categoria?.nombre.toLowerCase().includes(q),
    );
  }, [tutoriales, busqueda]);

  const handleTutorialPress = useCallback(
    (tutorial: TutorialConProgreso) => {
      router.push({
        pathname: '/articulos/[id]',
        params: { id: tutorial.id },
      });
    },
    [router],
  );

  const handleCategoriaPress = useCallback((cat: CategoriaTutorial) => {
    // "Todo" = null (sin filtro)
    setCategoriaSeleccionada(cat.nombre === 'Todo' ? null : cat.id);
    setBusqueda('');
  }, []);

  const renderTutorial = useCallback(
    ({ item }: { item: TutorialConProgreso }) => (
      <TutorialCard tutorial={item} onPress={() => handleTutorialPress(item)} />
    ),
    [handleTutorialPress],
  );

  // Categoría activa (para resaltar el chip seleccionado)
  const categoriaActivaNombre = categoriaSeleccionada
    ? (categorias.find((c) => c.id === categoriaSeleccionada)?.nombre ?? '')
    : 'Todo';

  return (
    <View style={styles.flex}>
      <AppHeader
        titulo="Tutoriales"
        mostrarVolver
        backgroundColor={Colors.brand.purple}
        textoHablar={`Tutoriales. Acá podés aprender a usar el celular paso a paso. ${
          tutorialesFiltrados.length > 0
            ? `Hay ${tutorialesFiltrados.length} tutorial${tutorialesFiltrados.length !== 1 ? 'es' : ''} disponible${tutorialesFiltrados.length !== 1 ? 's' : ''}.`
            : 'No hay tutoriales disponibles con ese filtro.'
        }`}
      />

      {/* ─── Barra de categorías ─── */}
      <View style={styles.categoriasWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriasList}
          keyboardShouldPersistTaps="handled"
        >
          {categorias.map((cat) => {
            const activa = cat.nombre === categoriaActivaNombre;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoriaChip, activa && styles.categoriaChipActivo]}
                onPress={() => handleCategoriaPress(cat)}
                activeOpacity={0.75}
                accessibilityLabel={`Filtrar por ${cat.nombre}`}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
              >
                {cat.emoji ? (
                  <Text style={styles.categoriaEmoji}>{cat.emoji}</Text>
                ) : null}
                <Text
                  style={[
                    styles.categoriaTexto,
                    activa && styles.categoriaTextoActivo,
                  ]}
                >
                  {cat.nombre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Buscador ─── */}
      <View style={styles.buscadorWrapper}>
        <Ionicons
          name="search"
          size={22}
          color={Colors.text.secondary}
          style={styles.buscadorIcon}
        />
        <TextInput
          style={styles.buscador}
          placeholder="Buscar tutorial..."
          placeholderTextColor={Colors.text.hint}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel="Buscar tutorial"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity
            onPress={() => setBusqueda('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Limpiar búsqueda"
          >
            <Ionicons name="close-circle" size={20} color={Colors.text.hint} />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Lista ─── */}
      {isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <Text style={styles.cargandoTexto}>Cargando tutoriales...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centrado}>
          <Text style={styles.estadoEmoji}>⚠️</Text>
          <Text style={styles.estadoTitulo}>No pudimos cargar los tutoriales</Text>
          <TouchableOpacity style={styles.btnReintentar} onPress={() => refetch()}>
            <Text style={styles.btnReintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tutorialesFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderTutorial}
          contentContainerStyle={[
            styles.lista,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.vacioEmoji}>📚</Text>
              <Text style={styles.vacioTitulo}>
                {busqueda
                  ? 'No encontramos tutoriales con esa búsqueda'
                  : 'No hay tutoriales en esta categoría aún'}
              </Text>
            </View>
          }
          ListHeaderComponent={
            tutorialesFiltrados.length > 0 ? (
              <Text style={styles.resultados}>
                {tutorialesFiltrados.length} tutorial{tutorialesFiltrados.length !== 1 ? 'es' : ''}
                {categoriaActivaNombre !== 'Todo' ? ` · ${categoriaActivaNombre}` : ''}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.ui.background },

  // Categorías
  categoriasWrapper: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  categoriasList: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  categoriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.background,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    minHeight: Spacing.touch.min,
  },
  categoriaChipActivo: {
    backgroundColor: Colors.brand.purple,
    borderColor: Colors.brand.purple,
  },
  categoriaEmoji: { fontSize: 17 },
  categoriaTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },
  categoriaTextoActivo: { color: Colors.text.onDark },

  // Buscador
  buscadorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    marginHorizontal: Spacing.screen.horizontal,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    minHeight: Spacing.touch.comfortable,
  },
  buscadorIcon: { marginRight: Spacing.sm },
  buscador: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    paddingVertical: Spacing.md,
  },

  // Lista
  lista: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.sm,
  },
  resultados: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    paddingLeft: Spacing.xs,
  },

  // Estado vacío / error
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
  },
  estadoEmoji: { fontSize: 64 },
  estadoTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  vacio: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.lg,
  },
  vacioEmoji: { fontSize: 80 },
  vacioTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 28,
  },
  cargandoTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },
  btnReintentar: {
    backgroundColor: Colors.brand.purple,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReintentarTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
});
