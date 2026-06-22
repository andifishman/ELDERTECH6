// Pantalla principal de Tutoriales — categorías, buscador y lista agrupada por función
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { TutorialCard } from '@/components/tutoriales/TutorialCard';
import { getIconoCategoria } from '@/components/tutoriales/categoriaIcono';
import { useAuth } from '@/context/AuthContext';
import { useCategoriasTutorial, useTutoriales } from '@/hooks/useTutoriales';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { TutorialConProgreso, CategoriaTutorial } from '@/types/database.types';

interface SeccionTutoriales {
  titulo: string | null; // null => sin encabezado (vista filtrada)
  data: TutorialConProgreso[];
}

export default function TutorialesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloFavoritos, setSoloFavoritos] = useState(false);

  const { data: categorias = [], refetch: refetchCategorias } = useCategoriasTutorial();
  const { data: tutoriales = [], isLoading, isError, isFetching, refetch } = useTutoriales(
    residenteId,
    categoriaSeleccionada,
  );

  const handleRefresh = useCallback(() => {
    refetch();
    refetchCategorias();
  }, [refetch, refetchCategorias]);

  const categoriaActivaNombre = categoriaSeleccionada
    ? (categorias.find((c) => c.id === categoriaSeleccionada)?.nombre ?? '')
    : 'Todo';

  const tutorialesFiltrados = useMemo(() => {
    let lista = tutoriales;

    // Filtro por categoría en cliente: garantiza que solo se vean los tutoriales
    // de la categoría seleccionada aunque el servidor devuelva todos (keepPreviousData)
    if (categoriaSeleccionada) {
      lista = lista.filter((t) => t.categoria_id === categoriaSeleccionada);
    }

    if (soloFavoritos) {
      lista = lista.filter((t) => t.progreso?.favorito);
    }
    const q = busqueda.toLowerCase().trim();
    if (q) {
      lista = lista.filter(
        (t) =>
          t.titulo.toLowerCase().includes(q) ||
          t.descripcion?.toLowerCase().includes(q) ||
          t.categoria?.nombre.toLowerCase().includes(q),
      );
    }
    return lista;
  }, [tutoriales, busqueda, soloFavoritos, categoriaSeleccionada]);

  // Agrupamos por función (categoría) solo en la vista "Todo" sin búsqueda ni favoritos.
  const agrupar = categoriaActivaNombre === 'Todo' && !busqueda.trim() && !soloFavoritos;

  const secciones = useMemo<SeccionTutoriales[]>(() => {
    if (!agrupar) {
      return tutorialesFiltrados.length > 0
        ? [{ titulo: null, data: tutorialesFiltrados }]
        : [];
    }
    const porCategoria = new Map<string, TutorialConProgreso[]>();
    for (const t of tutorialesFiltrados) {
      // Tutoriales sin categoría o asignados a la categoría "Todo" (el chip "all")
      // se muestran en "Otros" para que nunca queden ocultos en la vista agrupada
      const nombre =
        t.categoria?.nombre && t.categoria.nombre !== 'Todo'
          ? t.categoria.nombre
          : 'Otros';
      const grupo = porCategoria.get(nombre);
      if (grupo) grupo.push(t);
      else porCategoria.set(nombre, [t]);
    }
    // Respetar el orden de las categorías (excluyendo "Todo")
    const seccionesOrdenadas = categorias
      .filter((c) => c.nombre !== 'Todo' && porCategoria.has(c.nombre))
      .map((c) => ({ titulo: c.nombre, data: porCategoria.get(c.nombre)! }));
    // Tutoriales sin categoría asignada al final
    const otros = porCategoria.get('Otros');
    if (otros?.length) seccionesOrdenadas.push({ titulo: 'Otros', data: otros });
    return seccionesOrdenadas;
  }, [agrupar, tutorialesFiltrados, categorias]);

  const handleTutorialPress = useCallback(
    (tutorial: TutorialConProgreso) => {
      router.push({ pathname: '/articulos/[id]', params: { id: tutorial.id } });
    },
    [router],
  );

  const handleCategoriaPress = useCallback((cat: CategoriaTutorial) => {
    setCategoriaSeleccionada(cat.nombre === 'Todo' ? null : cat.id);
    setBusqueda('');
  }, []);

  // Header de la lista: chips de categoría + buscador + contador
  const ListHeader = (
    <View>
      {/* Chips de categoría */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriasList}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
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
              <Ionicons
                name={getIconoCategoria(cat.nombre)}
                size={16}
                color={activa ? Colors.text.onDark : Colors.brand.purple}
              />
              <Text style={[styles.categoriaTexto, activa && styles.categoriaTextoActivo]}>
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Buscador + filtro de favoritos */}
      <View style={styles.buscadorRow}>
        <View style={styles.buscadorWrapper}>
          <Ionicons name="search" size={20} color={Colors.text.secondary} style={styles.buscadorIcon} />
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
        <TouchableOpacity
          style={[styles.favToggle, soloFavoritos && styles.favToggleActivo]}
          onPress={() => setSoloFavoritos((v) => !v)}
          activeOpacity={0.75}
          accessibilityLabel={soloFavoritos ? 'Mostrar todos los tutoriales' : 'Mostrar solo favoritos'}
          accessibilityRole="button"
          accessibilityState={{ selected: soloFavoritos }}
        >
          <Ionicons
            name={soloFavoritos ? 'star' : 'star-outline'}
            size={22}
            color={soloFavoritos ? Colors.text.onDark : '#FFC107'}
          />
        </TouchableOpacity>
      </View>

      {/* Contador (solo en vistas filtradas; al agrupar, cada sección tiene su título) */}
      {!agrupar && tutorialesFiltrados.length > 0 && (
        <Text style={styles.resultados}>
          {tutorialesFiltrados.length} tutorial{tutorialesFiltrados.length !== 1 ? 'es' : ''}
          {categoriaActivaNombre !== 'Todo' ? ` · ${categoriaActivaNombre}` : ''}
          {soloFavoritos ? ' · Favoritos' : ''}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.flex}>
      <AppHeader
        titulo="Tutoriales"
        mostrarVolver
        backgroundColor={Colors.brand.purple}
        textoHablar="Tutoriales. Acá podés aprender a usar el celular paso a paso."
      />

      {isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <Text style={styles.cargandoTexto}>Cargando tutoriales...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centrado}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.text.hint} />
          <Text style={styles.estadoTitulo}>No pudimos cargar los tutoriales</Text>
          <TouchableOpacity style={styles.btnReintentar} onPress={() => refetch()}>
            <Text style={styles.btnReintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TutorialCard tutorial={item} onPress={() => handleTutorialPress(item)} />
          )}
          renderSectionHeader={({ section }) =>
            section.titulo ? (
              <View style={styles.seccionHeader}>
                <Ionicons name={getIconoCategoria(section.titulo)} size={20} color={Colors.brand.purple} />
                <Text style={styles.seccionTitulo}>{section.titulo}</Text>
              </View>
            ) : null
          }
          ListHeaderComponent={ListHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={handleRefresh}
              colors={[Colors.brand.purple]}
              tintColor={Colors.brand.purple}
            />
          }
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Ionicons name="school-outline" size={64} color={Colors.ui.disabled} />
              <Text style={styles.vacioTitulo}>
                {busqueda
                  ? 'No encontramos tutoriales con esa búsqueda'
                  : soloFavoritos
                    ? 'Todavía no marcaste tutoriales favoritos'
                    : 'No hay tutoriales en esta categoría aún'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.ui.background },

  // Categorías
  categoriasList: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  categoriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.background,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    minHeight: 40,
  },
  categoriaChipActivo: {
    backgroundColor: Colors.brand.purple,
    borderColor: Colors.brand.purple,
  },
  categoriaTexto: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
  },
  categoriaTextoActivo: { color: Colors.text.onDark },

  // Encabezado de sección (agrupación por función)
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  seccionTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },

  // Buscador
  buscadorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.screen.horizontal,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  buscadorWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    height: 44,
  },
  buscadorIcon: { marginRight: Spacing.sm },
  buscador: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
  },
  favToggle: {
    width: 44,
    height: 44,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ui.surface,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  favToggleActivo: {
    backgroundColor: '#FFC107',
    borderColor: '#FFC107',
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
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    paddingLeft: Spacing.xs,
  },

  // Estados
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
  },
  estadoTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  vacio: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.lg,
  },
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
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReintentarTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
});
