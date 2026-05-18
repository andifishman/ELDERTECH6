/**
 * clima.tsx
 * ─────────
 * Pantalla principal de Clima.
 *
 * Funcionalidades:
 *  - Muestra el clima de la ciudad natal (Buenos Aires) y de ciudades agregadas
 *  - Selector de ciudades en la parte superior (tabs deslizables)
 *  - Botón "+" para buscar y agregar nuevas ciudades
 *  - Botón "Eliminar ciudad" para borrar ciudades agregadas (no la natal)
 *  - Las ciudades se guardan en AsyncStorage para persistir entre sesiones
 *  - Diseño optimizado para personas mayores: texto grande, colores claros, botones amplios
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { LoadingState, ErrorState } from '@/components/common/LoadingState';
import { useClima, useClimaCiudad } from '@/hooks/useClima';
import { buscarCiudades } from '@/services/climaService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { PronosticoDia, GeocodingResult, CiudadGuardada } from '@/types/clima.types';

// Clave de AsyncStorage donde se guardan las ciudades del usuario
const STORAGE_KEY = 'eldertech_ciudades_clima';

// Ciudad natal fija — siempre presente, no se puede eliminar
const CIUDAD_NATAL: CiudadGuardada = {
  id: 'natal',
  nombre: 'Buenos Aires',
  pais: 'AR',
  paisNombre: 'Argentina',
  lat: -34.6037,
  lon: -58.3816,
  timezone: 'America/Argentina/Buenos_Aires',
  esNatal: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ClimaScreen() {
  // Lista de ciudades guardadas por el usuario (incluye la natal)
  const [ciudades, setCiudades] = useState<CiudadGuardada[]>([CIUDAD_NATAL]);

  // Ciudad actualmente seleccionada en el selector de tabs
  const [ciudadActiva, setCiudadActiva] = useState<CiudadGuardada>(CIUDAD_NATAL);

  // Control del modal de búsqueda de ciudades
  const [modalVisible, setModalVisible] = useState(false);

  // Control del modal de confirmación de eliminación
  const [modalEliminar, setModalEliminar] = useState(false);

  // Texto ingresado en el buscador de ciudades
  const [busqueda, setBusqueda] = useState('');

  // Resultados de la búsqueda de ciudades
  const [resultados, setResultados] = useState<GeocodingResult[]>([]);

  // Indica si se está buscando ciudades en la API
  const [buscando, setBuscando] = useState(false);

  // Hook para el clima de la ciudad natal (siempre cargado)
  const climaNatal = useClima();

  // Hook para el clima de la ciudad activa (si no es la natal)
  const climaCiudad = useClimaCiudad(
    ciudadActiva.esNatal ? null : ciudadActiva
  );

  // Seleccionar qué datos mostrar según la ciudad activa
  const { data, isLoading, error, refetch, isRefetching } = ciudadActiva.esNatal
    ? climaNatal
    : climaCiudad;

  // ── Cargar ciudades guardadas desde AsyncStorage al iniciar ──
  useEffect(() => {
    async function cargarCiudades() {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const guardadas: CiudadGuardada[] = JSON.parse(json);
          // Siempre asegurarse de que la ciudad natal esté primera
          setCiudades([CIUDAD_NATAL, ...guardadas.filter((c) => !c.esNatal)]);
        }
      } catch {
        // Si falla la lectura, simplemente usar solo la ciudad natal
      }
    }
    cargarCiudades();
  }, []);

  // ── Guardar ciudades en AsyncStorage cada vez que cambian ──
  const persistirCiudades = useCallback(async (lista: CiudadGuardada[]) => {
    try {
      // Solo guardar las ciudades no natales (la natal es fija)
      const sinNatal = lista.filter((c) => !c.esNatal);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sinNatal));
    } catch {
      // Fallo silencioso — la app sigue funcionando sin persistencia
    }
  }, []);

  // ── Buscar ciudades en la API mientras el usuario escribe ──
  useEffect(() => {
    // No buscar si el texto es muy corto
    if (busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }

    // Debounce: esperar 400ms después de que el usuario deje de escribir
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await buscarCiudades(busqueda);
        setResultados(res);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [busqueda]);

  // ── Agregar una ciudad seleccionada desde los resultados de búsqueda ──
  function agregarCiudad(geo: GeocodingResult) {
    // Verificar que la ciudad no esté ya en la lista
    const yaExiste = ciudades.some(
      (c) => Math.abs(c.lat - geo.latitude) < 0.01 && Math.abs(c.lon - geo.longitude) < 0.01
    );
    if (yaExiste) {
      setModalVisible(false);
      setBusqueda('');
      setResultados([]);
      return;
    }

    const nueva: CiudadGuardada = {
      id: String(Date.now()),
      nombre: geo.name,
      pais: geo.country_code,
      paisNombre: geo.country ?? geo.country_code,
      lat: geo.latitude,
      lon: geo.longitude,
      timezone: geo.timezone,
      esNatal: false,
    };

    const nuevaLista = [...ciudades, nueva];
    setCiudades(nuevaLista);
    persistirCiudades(nuevaLista);

    // Seleccionar automáticamente la ciudad recién agregada
    setCiudadActiva(nueva);

    // Cerrar el modal y limpiar la búsqueda
    setModalVisible(false);
    setBusqueda('');
    setResultados([]);
  }

  // ── Eliminar la ciudad activa (solo si no es la natal) ──
  function confirmarEliminar() {
    if (ciudadActiva.esNatal) return;

    const nuevaLista = ciudades.filter((c) => c.id !== ciudadActiva.id);
    setCiudades(nuevaLista);
    persistirCiudades(nuevaLista);

    // Volver a la ciudad natal después de eliminar
    setCiudadActiva(CIUDAD_NATAL);
    setModalEliminar(false);
  }

  // ── Texto para el botón de voz (TTS) ──
  const textoHablar = data ? [
    `Clima en ${data.ciudad}.`,
    `Temperatura actual: ${data.temperatura} grados.`,
    `${data.descripcion}.`,
    `Máxima ${data.tempMax} grados, mínima ${data.tempMin} grados.`,
    `Sensación térmica ${data.sensacionTermica} grados.`,
    `Humedad ${data.humedad} por ciento.`,
    `Viento ${data.viento} kilómetros por hora.`,
  ].join(' ') : 'Clima';

  return (
    <View style={styles.root}>
      {/* ── Encabezado de pantalla ── */}
      <AppHeader
        titulo="Clima"
        mostrarVolver
        textoHablar={textoHablar}
        tituloGrande
      />

      {/* ── Selector de ciudades con flechas ── */}
      {/* Muestra hasta 3 ciudades a la vez. Si hay más, aparecen flechas para navegar.
          El botón "+" siempre es visible al final. */}
      <CiudadSelector
        ciudades={ciudades}
        ciudadActiva={ciudadActiva}
        onSeleccionar={setCiudadActiva}
        onAgregar={() => setModalVisible(true)}
      />

      {/* ── Contenido principal: clima de la ciudad activa ── */}
      {isLoading ? (
        <LoadingState mensaje={`Cargando clima de ${ciudadActiva.nombre}...`} />
      ) : error || !data ? (
        <ErrorState
          mensaje="No se pudo cargar el clima. Verificá tu conexión."
          onReintentar={refetch}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.text.onDark}
            />
          }
        >
          {/* Botón eliminar ciudad (solo visible si no es la natal) */}
          {!ciudadActiva.esNatal && (
            <TouchableOpacity
              style={styles.eliminarBtn}
              onPress={() => setModalEliminar(true)}
              accessibilityLabel={`Eliminar ${ciudadActiva.nombre}`}
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={18} color={Colors.text.onDark} />
              <Text style={styles.eliminarBtnTexto}>Eliminar ciudad</Text>
            </TouchableOpacity>
          )}

          {/* ── Card principal con gradiente azul ── */}
          <LinearGradient
            colors={['#1565C0', '#1976D2', '#2196F3']}
            style={styles.weatherCard}
          >
            <Text style={styles.ciudadNombre}>{data.ciudad}</Text>
            <Text style={styles.ciudadPais}>{data.pais}</Text>
            <Text style={styles.weatherEmoji}>{data.emoji}</Text>
            <Text style={styles.temperatura}>{data.temperatura}°C</Text>
            <Text style={styles.descripcion}>{data.descripcion}</Text>
            <Text style={styles.maxMin}>
              Máx {data.tempMax}° · Mín {data.tempMin}°
            </Text>

            {/* Detalles: sensación, humedad, viento */}
            <View style={styles.detallesRow}>
              <DetalleItem emoji="🌡️" valor={`${data.sensacionTermica}°C`} label="Sensación" />
              <DetalleItem emoji="💧" valor={`${data.humedad}%`} label="Humedad" />
              <DetalleItem emoji="💨" valor={`${data.viento} km/h`} label="Viento" />
            </View>
          </LinearGradient>

          {/* ── Pronóstico 7 días ── */}
          <View style={styles.pronosticoContainer}>
            <Text style={styles.pronosticoTitulo}>Pronóstico 7 días</Text>
            {data.pronostico.map((dia: PronosticoDia) => (
              <PronosticoDiaRow key={dia.fecha} dia={dia} />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Modal: buscar y agregar ciudad ── */}
      <Modal visible={modalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Agregar ciudad</Text>

            {/* Campo de búsqueda */}
            <TextInput
              style={styles.searchInput}
              placeholder="Escribí el nombre de la ciudad..."
              placeholderTextColor={Colors.text.hint}
              value={busqueda}
              onChangeText={setBusqueda}
              autoFocus
              autoCorrect={false}
              accessibilityLabel="Buscar ciudad"
            />

            {/* Indicador de carga mientras busca */}
            {buscando && (
              <ActivityIndicator
                size="small"
                color={Colors.weather.background}
                style={{ marginVertical: Spacing.sm }}
              />
            )}

            {/* Lista de resultados */}
            <FlatList
              data={resultados}
              keyExtractor={(_, i) => String(i)}
              style={styles.resultadosList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultadoItem}
                  onPress={() => agregarCiudad(item)}
                  accessibilityLabel={`Agregar ${item.name}, ${item.country}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.resultadoNombre}>{item.name}</Text>
                  <Text style={styles.resultadoDetalle}>
                    {[item.admin1, item.country].filter(Boolean).join(', ')}
                  </Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separador} />}
            />

            {/* Botón cancelar */}
            <TouchableOpacity
              style={styles.cancelarBtn}
              onPress={() => {
                setModalVisible(false);
                setBusqueda('');
                setResultados([]);
              }}
            >
              <Text style={styles.cancelarBtnTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: confirmar eliminación de ciudad ── */}
      <Modal visible={modalEliminar} transparent animationType="fade">
        <View style={styles.modalOverlayCentrado}>
          <View style={styles.modalBoxPequeno}>
            <Text style={styles.modalTitulo}>Eliminar ciudad</Text>
            <Text style={styles.modalMensaje}>
              ¿Querés eliminar {ciudadActiva.nombre}?
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.btnEliminarModal}
                onPress={confirmarEliminar}
              >
                <Text style={styles.btnEliminarModalTexto}>Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCancelarModal}
                onPress={() => setModalEliminar(false)}
              >
                <Text style={styles.btnCancelarModalTexto}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Selector de ciudades con flechas de navegación.
 * Muestra hasta 3 tabs a la vez. Si hay más ciudades, las flechas permiten navegar.
 * El botón "+" siempre está visible al final para agregar nuevas ciudades.
 */
function CiudadSelector({
  ciudades,
  ciudadActiva,
  onSeleccionar,
  onAgregar,
}: {
  ciudades: CiudadGuardada[];
  ciudadActiva: CiudadGuardada;
  onSeleccionar: (c: CiudadGuardada) => void;
  onAgregar: () => void;
}) {
  // Cuántas ciudades mostrar a la vez (sin contar el botón "+")
  const VISIBLE = 3;
  const [inicio, setInicio] = useState(0);

  // Cuando se selecciona una ciudad, asegurarse de que sea visible
  useEffect(() => {
    const idx = ciudades.findIndex((c) => c.id === ciudadActiva.id);
    if (idx < 0) return;
    if (idx < inicio) setInicio(idx);
    else if (idx >= inicio + VISIBLE) setInicio(Math.max(0, idx - VISIBLE + 1));
  }, [ciudadActiva, ciudades]);

  const puedeAtras = inicio > 0;
  const puedeAdelante = inicio + VISIBLE < ciudades.length;
  const visibles = ciudades.slice(inicio, inicio + VISIBLE);

  return (
    <View style={styles.ciudadesBar}>
      {/* Flecha izquierda — solo visible si hay ciudades ocultas a la izquierda */}
      <TouchableOpacity
        style={[styles.ciudadArrow, !puedeAtras && styles.ciudadArrowHidden]}
        onPress={() => puedeAtras && setInicio((p) => p - 1)}
        disabled={!puedeAtras}
        accessibilityLabel="Ciudad anterior"
      >
        <Ionicons name="chevron-back" size={22} color={Colors.text.secondary} />
      </TouchableOpacity>

      {/* Tabs de ciudades visibles */}
      <View style={styles.ciudadesRow}>
        {visibles.map((ciudad) => {
          const activa = ciudad.id === ciudadActiva.id;
          return (
            <TouchableOpacity
              key={ciudad.id}
              style={[styles.ciudadTab, activa && styles.ciudadTabActiva]}
              onPress={() => onSeleccionar(ciudad)}
              accessibilityLabel={`Ver clima de ${ciudad.nombre}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
            >
              <Text
                style={[styles.ciudadTabTexto, activa && styles.ciudadTabTextoActivo]}
              >
                {ciudad.nombre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Flecha derecha — solo visible si hay ciudades ocultas a la derecha */}
      <TouchableOpacity
        style={[styles.ciudadArrow, !puedeAdelante && styles.ciudadArrowHidden]}
        onPress={() => puedeAdelante && setInicio((p) => p + 1)}
        disabled={!puedeAdelante}
        accessibilityLabel="Ciudad siguiente"
      >
        <Ionicons name="chevron-forward" size={22} color={Colors.text.secondary} />
      </TouchableOpacity>

      {/* Botón "+" siempre visible para agregar ciudad */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={onAgregar}
        accessibilityLabel="Agregar ciudad"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={24} color={Colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

/** Muestra un detalle del clima (sensación, humedad o viento) dentro de la card */
function DetalleItem({ emoji, valor, label }: { emoji: string; valor: string; label: string }) {
  return (
    <View style={styles.detalleItem}>
      <Text style={styles.detalleEmoji}>{emoji}</Text>
      <Text style={styles.detalleValor}>{valor}</Text>
      <Text style={styles.detalleLabel}>{label}</Text>
    </View>
  );
}

/** Muestra una fila del pronóstico de 7 días */
function PronosticoDiaRow({ dia }: { dia: PronosticoDia }) {
  return (
    <View style={styles.pronosticoRow}>
      <Text style={styles.pronosticoDia}>{dia.labelDia}</Text>
      <Text style={styles.pronosticoEmoji}>{dia.emoji}</Text>
      <Text style={styles.pronosticoTemps}>
        {dia.tempMax}° / {dia.tempMin}°
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },

  // ── Selector de ciudades ──
  ciudadesBar: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  ciudadArrow: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ciudadArrowHidden: {
    opacity: 0,           // Invisible pero ocupa espacio para mantener el layout
  },
  ciudadesRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'flex-start',
  },
  ciudadesScroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ciudadTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.background,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    alignItems: 'center',
  },
  ciudadTabActiva: {
    backgroundColor: Colors.weather.background,
    borderColor: Colors.weather.background,
  },
  ciudadTabTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.regular,
  },
  ciudadTabTextoActivo: {
    color: Colors.text.onDark,
    fontWeight: Typography.weight.medium,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: Spacing.xs,
  },

  // ── Botón eliminar ciudad ──
  eliminarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.red,
    marginHorizontal: Spacing.screen.horizontal,
    marginTop: Spacing.md,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.md,
  },
  eliminarBtnTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.medium,
  },

  // ── Card principal de clima ──
  weatherCard: {
    margin: Spacing.screen.horizontal,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.xxl,
    alignItems: 'flex-start',     // Todo alineado a la izquierda
    gap: Spacing.sm,
    elevation: 4,
    shadowColor: Colors.weather.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  ciudadNombre: {
    fontSize: 30,
    fontWeight: Typography.weight.medium,
    color: Colors.text.onDark,
  },
  ciudadPais: {
    fontSize: Typography.size.md,
    color: Colors.text.onDarkSecondary,
  },
  weatherEmoji: {
    fontSize: 88,
    marginVertical: Spacing.sm,
  },
  temperatura: {
    fontSize: 72,
    fontWeight: Typography.weight.regular,
    color: Colors.text.onDark,
    lineHeight: 80,
  },
  descripcion: {
    fontSize: Typography.size.xl,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.regular,
  },
  maxMin: {
    fontSize: Typography.size.lg,
    color: Colors.text.onDarkSecondary,
  },
  detallesRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    backgroundColor: Colors.weather.card,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.weather.cardBorder,
    overflow: 'hidden',
    width: '100%',
  },
  detalleItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: 6,
  },
  detalleEmoji: { fontSize: 26 },
  detalleValor: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.medium,
    color: Colors.text.onDark,
  },
  detalleLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.onDarkSecondary,
  },

  // ── Pronóstico 7 días ──
  pronosticoContainer: {
    backgroundColor: Colors.ui.surface,
    margin: Spacing.screen.horizontal,
    marginTop: 0,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xxxl,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  pronosticoTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  pronosticoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  pronosticoDia: {
    flex: 1,
    fontSize: Typography.size.lg,
    color: Colors.text.primary,
    fontWeight: Typography.weight.regular,
  },
  pronosticoEmoji: {
    fontSize: 28,
    width: 42,
    textAlign: 'center',
  },
  pronosticoTemps: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.regular,
    textAlign: 'right',
    minWidth: 90,
  },

  // ── Modal buscar ciudad ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',  // Panel pegado arriba
    paddingTop: 80,                // Espacio para el header de la app
  },
  modalBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 24,
    marginHorizontal: Spacing.md,
    padding: Spacing.xxl,
    flex: 1,                       // Ocupa todo el espacio hasta abajo
    marginBottom: 0,
    flexDirection: 'column',       // Layout en columna para poder empujar el botón al fondo
  },
  modalTitulo: {
    fontSize: 28,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  searchInput: {
    backgroundColor: Colors.ui.background,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    marginBottom: Spacing.sm,
  },
  resultadosList: {
    flex: 1,           // Crece para ocupar el espacio disponible y empuja el botón al fondo
  },
  resultadoItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  resultadoNombre: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
  },
  resultadoDetalle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  separador: {
    height: 1,
    backgroundColor: Colors.ui.border,
  },
  cancelarBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderRadius: Spacing.radius.lg,
    backgroundColor: '#BDBDBD',    // Gris más oscuro — más visible
    width: '100%',
  },
  cancelarBtnTexto: {
    fontSize: Typography.size.lg,
    color: '#424242',              // Texto oscuro sobre fondo gris
    fontWeight: Typography.weight.medium,
  },

  // ── Modal confirmar eliminación — centrado en pantalla ──
  modalOverlayCentrado: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Modal confirmar eliminación ──
  modalBoxPequeno: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 20,
    padding: Spacing.xxl,
    marginHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  modalMensaje: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    lineHeight: 30,
  },
  modalBtns: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  btnCancelarModal: {
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.ui.background,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    alignItems: 'center',
    width: '100%',
  },
  btnCancelarModalTexto: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
  },
  btnEliminarModal: {
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.brand.red,
    alignItems: 'center',
    width: '100%',
  },
  btnEliminarModalTexto: {
    fontSize: Typography.size.lg,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.medium,
  },
});
