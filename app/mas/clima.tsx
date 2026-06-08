
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

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Clave de AsyncStorage donde se persisten las ciudades del usuario */
const STORAGE_KEY = 'eldertech_ciudades_clima';
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
  /** Lista completa de ciudades (natal + las que agregó el usuario) */
  const [ciudades, setCiudades] = useState<CiudadGuardada[]>([CIUDAD_NATAL]);

  /** Ciudad cuyo clima se está mostrando actualmente */
  const [ciudadActiva, setCiudadActiva] = useState<CiudadGuardada>(CIUDAD_NATAL);

  /** Controla si el modal de búsqueda de ciudades está abierto */
  const [modalVisible, setModalVisible] = useState(false);

  /** Controla si el modal de confirmación de eliminación está abierto */
  const [modalEliminar, setModalEliminar] = useState(false);

  /** Texto que el usuario escribe en el buscador de ciudades */
  const [busqueda, setBusqueda] = useState('');

  /** Resultados devueltos por la API de geocodificación */
  const [resultados, setResultados] = useState<GeocodingResult[]>([]);

  /** true mientras se espera respuesta de la API de búsqueda */
  const [buscando, setBuscando] = useState(false);

  // Hook de React Query para el clima de la ciudad natal
  const climaNatal = useClima();

  // Hook de React Query para el clima de la ciudad activa (si no es la natal)
  const climaCiudad = useClimaCiudad(ciudadActiva.esNatal ? null : ciudadActiva);

  // Usar los datos de la ciudad natal o de la ciudad activa según corresponda
  const { data, isLoading, error, refetch, isRefetching } = ciudadActiva.esNatal
    ? climaNatal
    : climaCiudad;

  // Refrescar siempre que cambia la ciudad activa
  useEffect(() => {
    refetch();
  }, [ciudadActiva.id]);

  // ── Cargar ciudades guardadas desde AsyncStorage al iniciar la pantalla ──
  useEffect(() => {
    async function cargarCiudades() {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const guardadas: CiudadGuardada[] = JSON.parse(json);
          // La ciudad natal siempre va primera, luego las guardadas
          setCiudades([CIUDAD_NATAL, ...guardadas.filter((c) => !c.esNatal)]);
        }
      } catch {
        // Si falla la lectura del storage, se usa solo la ciudad natal
      }
    }
    cargarCiudades();
  }, []);

  /** Guarda la lista de ciudades en AsyncStorage (excluye la natal que es fija) */
  const persistirCiudades = useCallback(async (lista: CiudadGuardada[]) => {
    try {
      const sinNatal = lista.filter((c) => !c.esNatal);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sinNatal));
    } catch {
      // Fallo silencioso — la app sigue funcionando aunque no se guarde
    }
  }, []);

  // ── Buscar ciudades en la API mientras el usuario escribe (con debounce) ──
  useEffect(() => {
    // No buscar si el texto tiene menos de 2 caracteres
    if (busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }

    // Esperar 400ms después del último tecleo antes de llamar a la API
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

    // Cancelar el timer si el usuario sigue escribiendo
    return () => clearTimeout(timer);
  }, [busqueda]);

  /** Agrega una ciudad seleccionada desde los resultados de búsqueda */
  function agregarCiudad(geo: GeocodingResult) {
    // Evitar duplicados comparando coordenadas con tolerancia de ~1km
    const yaExiste = ciudades.some(
      (c) => Math.abs(c.lat - geo.latitude) < 0.01 && Math.abs(c.lon - geo.longitude) < 0.01
    );
    if (yaExiste) {
      setModalVisible(false);
      setBusqueda('');
      setResultados([]);
      return;
    }

    // Crear el objeto de ciudad guardada con un ID único basado en timestamp
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

    // Seleccionar automáticamente la ciudad recién agregada para mostrar su clima
    setCiudadActiva(nueva);

    // Cerrar el modal y limpiar el estado de búsqueda
    setModalVisible(false);
    setBusqueda('');
    setResultados([]);
  }

  /** Elimina la ciudad activa (solo funciona si no es la natal) */
  function confirmarEliminar() {
    if (ciudadActiva.esNatal) return;

    const nuevaLista = ciudades.filter((c) => c.id !== ciudadActiva.id);
    setCiudades(nuevaLista);
    persistirCiudades(nuevaLista);

    // Volver a la ciudad natal después de eliminar
    setCiudadActiva(CIUDAD_NATAL);
    setModalEliminar(false);
  }

  /** Texto que lee el botón de voz (TTS) describiendo el clima actual */
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

      {/* ── Encabezado: título "Clima" grande + botón volver + botón voz ── */}
      <AppHeader
        titulo="Clima"
        mostrarVolver
        textoHablar={textoHablar}
        tituloGrande
      />

      {/* ── Selector de ciudades con flechas de navegación ── */}
      {/* Muestra hasta 3 ciudades a la vez.
          Si hay más, aparecen flechas ‹ › para navegar.
          El botón "Agregar ciudad" siempre está visible al final. */}
      <CiudadSelector
        ciudades={ciudades}
        ciudadActiva={ciudadActiva}
        onSeleccionar={setCiudadActiva}
        onAgregar={() => setModalVisible(true)}
      />

      {/* ── Contenido principal: clima de la ciudad activa ── */}
      {isLoading ? (
        // Estado de carga — spinner con nombre de la ciudad
        <LoadingState mensaje={`Cargando clima de ${ciudadActiva.nombre}...`} />
      ) : error || !data ? (
        // Estado de error — mensaje y botón para reintentar
        <ErrorState
          mensaje="No se pudo cargar el clima. Verificá tu conexión."
          onReintentar={refetch}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 0 }}
          refreshControl={
            // Pull-to-refresh para actualizar el clima manualmente
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.text.onDark}
            />
          }
        >
          {/* ── Card principal con gradiente azul ── */}
          <LinearGradient
            colors={['#1565C0', '#1976D2', '#2196F3']}
            style={styles.weatherCard}
          >
            {/* Nombre y código de país */}
            <Text style={styles.ciudadNombre}>{data.ciudad}</Text>
            <Text style={styles.ciudadPais}>{data.pais}</Text>

            {/* Emoji del estado del tiempo */}
            <Text style={styles.weatherEmoji}>{data.emoji}</Text>

            {/* Temperatura actual en grande */}
            <Text style={styles.temperatura}>{data.temperatura}°C</Text>

            {/* Descripción textual y rango del día */}
            <Text style={styles.descripcion}>{data.descripcion}</Text>
            <Text style={styles.maxMin}>
              Máx {data.tempMax}° · Mín {data.tempMin}°
            </Text>

            {/* Caja de detalles: sensación térmica, humedad y viento */}
            <View style={styles.detallesRow}>
              <DetalleItem emoji="🌡️" valor={`${data.sensacionTermica}°C`} label="Sensación" />
              <DetalleItem emoji="💧" valor={`${data.humedad}%`} label="Humedad" />
              <DetalleItem emoji="💨" valor={`${data.viento} km/h`} label="Viento" />
            </View>
          </LinearGradient>

          {/* ── Pronóstico de los próximos 7 días ── */}
          <View style={styles.pronosticoContainer}>
            <Text style={styles.pronosticoTitulo}>Pronóstico 7 días</Text>
            {data.pronostico.map((dia: PronosticoDia) => (
              <PronosticoDiaRow key={dia.fecha} dia={dia} />
            ))}
          </View>

          {/* Botón "Eliminar ciudad" — solo visible si la ciudad activa no es la natal, abajo de todo */}
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
        </ScrollView>
      )}

      {/* ── Modal: buscar y agregar una nueva ciudad ── */}
      {/* Se abre al tocar "Agregar ciudad". Ocupa toda la pantalla desde arriba. */}
      <Modal visible={modalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Agregar ciudad</Text>

            {/* Campo de texto para escribir el nombre de la ciudad */}
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

            {/* Spinner mientras se espera respuesta de la API */}
            {buscando && (
              <ActivityIndicator
                size="small"
                color={Colors.weather.background}
                style={{ marginVertical: Spacing.sm }}
              />
            )}

            {/* Lista de ciudades encontradas — al tocar una se agrega */}
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

            {/* Botón cancelar — pegado al fondo del panel */}
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
      {/* Centrado en pantalla. Muestra el nombre de la ciudad a eliminar. */}
      <Modal visible={modalEliminar} transparent animationType="fade">
        <View style={styles.modalOverlayCentrado}>
          <View style={styles.modalBoxPequeno}>
            <Text style={styles.modalTitulo}>Eliminar ciudad</Text>
            <Text style={styles.modalMensaje}>
              ¿Querés eliminar {ciudadActiva.nombre}?
            </Text>
            <View style={styles.modalBtns}>
              {/* Botón principal: confirmar eliminación */}
              <TouchableOpacity
                style={styles.btnEliminarModal}
                onPress={confirmarEliminar}
              >
                <Text style={styles.btnEliminarModalTexto}>Eliminar</Text>
              </TouchableOpacity>
              {/* Botón secundario: cancelar y volver */}
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
 * CiudadSelector
 * ──────────────
 * Layout fijo de 3 filas:
 *   Fila 1: ciudades en posiciones pares  (0, 2, 4...)
 *   Fila 2: ciudades en posiciones impares (1, 3, 5...) — si no hay, queda vacia
 *   Fila 3: boton "Agregar ciudad" solo
 *
 * Caso pocas ciudades (todas caben en fila 1):
 *   Fila 1: ciudades
 *   Fila 2: boton "Agregar ciudad"  (la fila 3 desaparece)
 *
 * Las flechas < > aparecen cuando hay mas ciudades de las que entran visualmente.
 */
const CHIP_WIDTH = 130;
const CHIPS_PER_PAGE = 3;

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
  return (
    <View style={styles.ciudadesBar}>
      {/* Chips de ciudades + botón agregar en un wrap continuo de izquierda a derecha */}
      <View style={styles.ciudadesWrap}>
        {ciudades.map((ciudad) => {
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
              <Text style={[styles.ciudadTabTexto, activa && styles.ciudadTabTextoActivo]}>
                {ciudad.nombre}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Botón agregar — fluye junto a los chips */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={onAgregar}
          accessibilityLabel="Agregar ciudad"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={18} color={Colors.text.secondary} />
          <Text style={styles.addBtnTexto}>Agregar ciudad</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * DetalleItem
 * ───────────
 * Muestra un dato puntual del clima dentro de la caja de detalles:
 * sensación térmica, humedad o velocidad del viento.
 */
function DetalleItem({ emoji, valor, label }: { emoji: string; valor: string; label: string }) {
  return (
    <View style={styles.detalleItem}>
      <Text style={styles.detalleEmoji}>{emoji}</Text>
      <Text style={styles.detalleValor}>{valor}</Text>
      <Text style={styles.detalleLabel}>{label}</Text>
    </View>
  );
}

/**
 * PronosticoDiaRow
 * ────────────────
 * Fila del pronóstico de 7 días.
 * Muestra: nombre del día | emoji del tiempo | temperaturas máx/mín
 */
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
  /** Contenedor raíz de toda la pantalla */
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },

  // ── Barra de selector de ciudades ──
  ciudadesBar: {
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  /** Chips de ciudades + botón agregar en un wrap de izquierda a derecha */
  ciudadesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  /** Tab de ciudad no seleccionada */
  ciudadTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.background,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    alignItems: 'center',
  },
  /** Tab de ciudad actualmente seleccionada — fondo azul */
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
  /** Botón "Agregar ciudad" con borde punteado — fluye junto a los chips */
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radius.full,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    borderStyle: 'dashed',
  },
  addBtnTexto: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },

  // ── Botón "Eliminar ciudad" (solo visible en ciudades no natales) ──
  eliminarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.red,
    marginHorizontal: Spacing.screen.horizontal,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.md,
  },
  eliminarBtnTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.medium,
  },

  // ── Card principal de clima (gradiente azul) ──
  weatherCard: {
    margin: Spacing.screen.horizontal,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',   // Todo el contenido centrado horizontalmente
    gap: Spacing.sm,
    elevation: 4,
    shadowColor: Colors.weather.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  /** Nombre de la ciudad en la card */
  ciudadNombre: {
    fontSize: 30,
    fontWeight: Typography.weight.medium,
    color: Colors.text.onDark,
    textAlign: 'center',
  },
  /** Código de país (AR, IT, FR...) */
  ciudadPais: {
    fontSize: Typography.size.md,
    color: Colors.text.onDarkSecondary,
    textAlign: 'center',
  },
  /** Emoji grande del estado del tiempo */
  weatherEmoji: {
    fontSize: 96,
    marginVertical: Spacing.md,
  },
  /** Temperatura actual en grande — el dato más importante */
  temperatura: {
    fontSize: 80,
    fontWeight: Typography.weight.regular,
    color: Colors.text.onDark,
    lineHeight: 88,
    textAlign: 'center',
  },
  /** Descripción textual: "Despejado", "Lluvia leve", etc. */
  descripcion: {
    fontSize: Typography.size.xl,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.regular,
    textAlign: 'center',
  },
  /** Rango de temperatura del día */
  maxMin: {
    fontSize: Typography.size.lg,
    color: Colors.text.onDarkSecondary,
    textAlign: 'center',
  },

  // ── Caja de detalles: sensación, humedad, viento ──
  detallesRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    backgroundColor: Colors.weather.card,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.weather.cardBorder,
    overflow: 'hidden',
    width: '100%',
  },
  /** Cada celda de la caja de detalles */
  detalleItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
  },
  detalleEmoji: { fontSize: 32 },
  detalleValor: {
    fontSize: 22,
    fontWeight: Typography.weight.medium,
    color: Colors.text.onDark,
  },
  detalleLabel: {
    fontSize: Typography.size.md,
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
    marginBottom: Spacing.md,
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
  /** Fila de un día del pronóstico */
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

  // ── Modal: buscar y agregar ciudad ──
  /** Fondo semitransparente del modal de búsqueda */
  modalOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    paddingTop: 80,
  },
  /** Caja blanca del modal — ocupa toda la pantalla desde el header hacia abajo */
  modalBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 24,
    marginHorizontal: Spacing.md,
    marginRight: Spacing.md,
    padding: Spacing.xxl,
    flex: 1,
    marginBottom: 0,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  /** Título compartido por ambos modales */
  modalTitulo: {
    fontSize: 28,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  /** Campo de texto para buscar ciudades */
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
  /** Lista de resultados — crece para empujar el botón Cancelar al fondo */
  resultadosList: {
    flex: 1,
  },
  /** Cada resultado de búsqueda */
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
  /** Botón Cancelar del modal de búsqueda — pegado al fondo */
  cancelarBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderRadius: Spacing.radius.lg,
    backgroundColor: '#BDBDBD',
    width: '100%',
  },
  cancelarBtnTexto: {
    fontSize: Typography.size.lg,
    color: '#424242',
    fontWeight: Typography.weight.medium,
  },

  // ── Modal: confirmar eliminación ──
  /** Fondo semitransparente centrado en pantalla */
  modalOverlayCentrado: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  /** Caja del modal de eliminación */
  modalBoxPequeno: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 20,
    padding: Spacing.xxl,
    width: '100%',
    gap: Spacing.md,
  },
  modalMensaje: {
    fontSize: 22,
    color: Colors.text.secondary,
    lineHeight: 32,
  },
  modalBtns: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: '100%',
  },
  /** Botón "Eliminar" — rojo, va primero */
  btnEliminarModal: {
    paddingVertical: Spacing.xl,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.brand.red,
    alignItems: 'center',
    width: '100%',
  },
  btnEliminarModalTexto: {
    fontSize: 22,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.medium,
  },
  /** Botón "Cancelar" — gris claro, va segundo */
  btnCancelarModal: {
    paddingVertical: Spacing.xl,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.ui.background,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    alignItems: 'center',
    width: '100%',
  },
  btnCancelarModalTexto: {
    fontSize: 22,
    color: Colors.text.secondary,
  },
});
