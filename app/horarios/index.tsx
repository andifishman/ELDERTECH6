/**
 * horarios/index.tsx
 * ──────────────────
 * Pantalla principal de Horarios del Día.
 *
 * Funcionalidades:
 *  - Muestra las actividades del día seleccionado (cargadas desde Supabase)
 *  - Carrusel de días con flechas para navegar día a día
 *  - La ventana de días se expande dinámicamente al llegar al borde
 *  - Si se alcanza el límite máximo (30 días), muestra un modal preguntando
 *    si el usuario quiere volver al día de hoy
 *
 * Diseño pensado para personas mayores:
 *  - Fecha completa siempre visible en la parte superior
 *  - Carrusel simple con flechas grandes — sin scroll manual
 *  - Mensajes claros cuando no hay actividades o se llega al límite
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { DaySelector } from '@/components/horarios/DaySelector';
import { ActividadCard } from '@/components/horarios/ActividadCard';
import { LoadingState, ErrorState } from '@/components/common/LoadingState';
import { useActividades } from '@/hooks/useActividades';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { formatFechaLarga } from '@/utils/dateUtils';
import type { ActividadCompleta } from '@/types/database.types';

/** Máximo de días que se pueden cargar hacia adelante o atrás desde hoy */
const MAX_DIAS_FUTURO = 30;
const MAX_DIAS_PASADO = 30;

/**
 * Genera un array de fechas centrado en `hoy`.
 * @param hoy          Fecha de referencia (normalmente la fecha actual)
 * @param diasAtras    Cuántos días incluir antes de hoy
 * @param diasAdelante Cuántos días incluir después de hoy
 */
function generarVentana(hoy: Date, diasAtras: number, diasAdelante: number): Date[] {
  const total = diasAtras + 1 + diasAdelante;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - diasAtras + i);
    return d;
  });
}

export default function HorariosScreen() {
  const hoy = new Date();

  const [diasAtras, setDiasAtras] = useState(0);
  const [diasAdelante, setDiasAdelante] = useState(0);
  const ventana = generarVentana(hoy, diasAtras, diasAdelante);
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy);
  const [mostrarModalLimite, setMostrarModalLimite] = useState(false);
  const [mensajeLimite, setMensajeLimite] = useState('');

  // Ref y estado para el botón de scroll
  const flatListRef = useRef<FlatList>(null);
  const [scrollY, setScrollY] = useState(0);
  const [listaAltura, setListaAltura] = useState(0);
  const [contenidoAltura, setContenidoAltura] = useState(0);

  // Baja un paso equivalente al 80% de la altura visible
  function bajarScroll() {
    const paso = listaAltura * 0.8;
    flatListRef.current?.scrollToOffset({ offset: scrollY + paso, animated: true });
  }

  // Muestra la flecha solo si hay contenido por debajo del viewport
  const hayMasAbajo = contenidoAltura > listaAltura && scrollY + listaAltura < contenidoAltura - 10;

  /**
   * Cada vez que el usuario cambia de día, revisamos si está cerca del borde de la ventana.
   * Si queda 1 día o menos de margen en alguna dirección, expandimos automáticamente
   * la ventana 7 días más (sin esperar a que toque la flecha en el límite).
   * Así el usuario nunca "frena" — los días nuevos ya están disponibles.
   */
  React.useEffect(() => {
    const diffFuturo = Math.round(
      (hoy.getTime() + diasAdelante * 86400000 - diaSeleccionado.getTime()) / 86400000
    );
    const diffPasado = Math.round(
      (diaSeleccionado.getTime() - (hoy.getTime() - diasAtras * 86400000)) / 86400000
    );

    // Si queda 1 día o menos al final de la ventana, expandir hacia adelante
    if (diffFuturo <= 1 && diasAdelante < MAX_DIAS_FUTURO) {
      setDiasAdelante((prev) => Math.min(prev + 7, MAX_DIAS_FUTURO));
    }
    // Si queda 1 día o menos al inicio de la ventana, expandir hacia atrás
    if (diffPasado <= 1 && diasAtras < MAX_DIAS_PASADO) {
      setDiasAtras((prev) => Math.min(prev + 7, MAX_DIAS_PASADO));
    }
  }, [diaSeleccionado, diasAtras, diasAdelante]);

  // Hook de React Query — carga las actividades del día seleccionado desde Supabase
  const { data: actividades, isLoading, error, refetch } = useActividades(diaSeleccionado);

  // Texto de la fecha para mostrar en el header y en el botón de voz
  const fechaLarga = formatFechaLarga(diaSeleccionado);

  /**
   * Llamado por DaySelector cuando el usuario intenta navegar más allá
   * del último día disponible en la ventana actual.
   *
   * Si aún no se alcanzó el límite máximo → expande la ventana 7 días más.
   * Si ya se alcanzó el límite → muestra el modal para volver a hoy.
   */
  const onPedirMasDias = useCallback((direccion: 'atras' | 'adelante') => {
    if (direccion === 'adelante') {
      if (diasAdelante >= MAX_DIAS_FUTURO) {
        setMensajeLimite('No hay más días cargados hacia adelante.');
        setMostrarModalLimite(true);
      } else {
        setDiasAdelante((prev) => Math.min(prev + 7, MAX_DIAS_FUTURO));
      }
    } else {
      if (diasAtras >= MAX_DIAS_PASADO) {
        setMensajeLimite('No hay más días cargados hacia atrás.');
        setMostrarModalLimite(true);
      } else {
        setDiasAtras((prev) => Math.min(prev + 7, MAX_DIAS_PASADO));
      }
    }
  }, [diasAtras, diasAdelante]);

  /** Vuelve al día de hoy y cierra el modal de límite */
  function volverAHoy() {
    setMostrarModalLimite(false);
    setDiaSeleccionado(new Date());
  }

  return (
    <View style={styles.root}>
      {/* ── Encabezado de pantalla ── */}
      <AppHeader
        titulo="Horarios"
        mostrarVolver
        textoHablar={`Horarios del Día. ${fechaLarga}`}
        backgroundColor={Colors.brand.red}
      />

      {/* ── Fecha seleccionada en texto completo ── */}
      {/* Siempre visible para que el usuario sepa qué día está viendo */}
      <View style={styles.fechaHeader}>
        <View style={styles.fechaRow}>
          <Text style={styles.fechaEmoji}>📅</Text>
          <Text style={styles.fechaTexto}>{fechaLarga}</Text>
        </View>
      </View>

      {/* ── Carrusel de días con flechas ── */}
      {/* Muestra 5 días a la vez; las flechas cambian el día seleccionado */}
      <DaySelector
        semana={ventana}
        diaSeleccionado={diaSeleccionado}
        onSeleccionar={setDiaSeleccionado}
        onPedirMasDias={onPedirMasDias}
      />

      {/* ── Lista de actividades del día seleccionado ── */}
      <View style={styles.listaContainer}>
        {isLoading ? (
          // Estado de carga — muestra un spinner con mensaje
          <LoadingState mensaje="Cargando actividades..." />
        ) : error ? (
          // Estado de error — muestra mensaje y botón para reintentar
          <ErrorState
            mensaje={error instanceof Error ? error.message : 'No se pudieron cargar las actividades.'}
            onReintentar={refetch}
          />
        ) : !actividades?.length ? (
          // Sin actividades — mensaje amigable
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTexto}>
              No hay actividades para este día.
            </Text>
          </View>
        ) : (
          // Lista de tarjetas de actividades con botón flotante de scroll
          <View style={styles.listaWrapper}>
            <FlatList
              ref={flatListRef}
              data={actividades}
              keyExtractor={(item) => item.id}
              renderItem={({ item }: { item: ActividadCompleta }) => (
                <ActividadCard
                  actividad={item}
                  onPress={() => router.push(`/horarios/${item.id}`)}
                />
              )}
              contentContainerStyle={styles.listaContent}
              showsVerticalScrollIndicator={false}
              onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
              onLayout={(e) => setListaAltura(e.nativeEvent.layout.height)}
              onContentSizeChange={(_, h) => setContenidoAltura(h)}
            />

            {/* Botón flotante de flecha — solo visible si hay más contenido abajo */}
            {hayMasAbajo && (
              <TouchableOpacity
                style={styles.flechaBtn}
                onPress={bajarScroll}
                activeOpacity={0.85}
                accessibilityLabel="Bajar para ver más actividades"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-down" size={32} color="#222" />
                <Text style={styles.flechaTexto}>Bajar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Modal: límite de días alcanzado ── */}
      {/* Aparece cuando el usuario intenta navegar más allá de los 30 días */}
      <Modal visible={mostrarModalLimite} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>📅</Text>
            <Text style={styles.modalTitulo}>Sin más días</Text>
            <Text style={styles.modalMensaje}>{mensajeLimite}</Text>
            <Text style={styles.modalPregunta}>¿Querés volver al día de hoy?</Text>
            <View style={styles.modalBtns}>
              {/* Botón principal: volver a hoy */}
              <TouchableOpacity style={styles.btnVolver} onPress={volverAHoy}>
                <Text style={styles.btnVolverTexto}>Volver a hoy</Text>
              </TouchableOpacity>
              {/* Botón secundario: quedarse en el día actual */}
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setMostrarModalLimite(false)}
              >
                <Text style={styles.btnCancelarTexto}>Quedarme aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },

  // Barra con la fecha completa en texto
  fechaHeader: {
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fechaEmoji: {
    fontSize: 26,
  },
  fechaTexto: {
    // Texto grande para que sea fácil de leer y ocupe todo el ancho disponible
    flex: 1,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },

  // Contenedor de la lista de actividades
  listaContainer: {
    flex: 1,
  },
  // Wrapper relativo para posicionar el botón flotante sobre la lista
  listaWrapper: {
    flex: 1,
    position: 'relative',
  },
  listaContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },

  // Estado vacío: sin actividades para el día
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTexto: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },

  // Botón flotante de flecha — sutil, color claro con transparencia
  flechaBtn: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -44,
    width: 88,
    paddingVertical: 12,
    borderRadius: 28,
    backgroundColor: 'rgba(224, 218, 218, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  flechaTexto: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#222',
  },

  // Modal de límite de días
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 20,
    padding: 32,
    width: '85%',
    alignItems: 'center',
    gap: Spacing.md,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalEmoji: {
    fontSize: 52,
  },
  modalTitulo: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.medium,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modalMensaje: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  modalPregunta: {
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 26,
  },
  modalBtns: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btnVolver: {
    backgroundColor: Colors.brand.red,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnVolverTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.medium,
  },
  btnCancelar: {
    backgroundColor: Colors.ui.background,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  btnCancelarTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.regular,
  },
});
