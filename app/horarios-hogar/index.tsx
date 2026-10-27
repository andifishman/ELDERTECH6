//pantalla de Horarios con las actividades del Hogar (vienen del sistema del hogar, vía nuestro backend).
//un día a la vez; el residente ve las de su piso y el empleado puede elegir cualquier piso o todo el hogar.
//la lectura en voz alta es el parlante del header
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState, LoadingState } from '@/components/common/LoadingState';
import { useHorariosHogar } from '@/hooks/useHorariosHogar';
import { useAuth } from '@/context/AuthContext';
import { perteneceAlSector, sectorDeMiPiso } from '@/utils/pisoHogar';
import { Colors } from '@/constants/Colors';
import type { ActividadHogar } from '@/services/horariosHogarService';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

//sección con la que se cargan los empleados del hogar en el backoffice
const SECCION_EMPLEADO = 'EMPLEADO LEDOR VADOR';

const COLOR_MANANA = '#1E9A9A';
const COLOR_TARDE = '#F08030';
const COLOR_TITULO = '#1F3A6E';
const COLOR_TEXTO = '#2D1B4E';
//el tallerista va en otro color para que se distinga del nombre de la actividad
const COLOR_TALLERISTA = '#0B6E99';
const FONDO_EN_CURSO = '#FFEB6B';
//desde esta hora la actividad cuenta como "tarde" (color de la tarjeta)
const HORA_CORTE_TARDE = 13;
//no sabemos cuánto dura cada actividad: se considera "en curso" durante una hora desde su inicio
const DURACION_MIN = 60;
const ANCHO_MAXIMO = 600;
//lo que ocupan los márgenes (lista + celda + tarjeta) en cada mitad de la grilla
const MARGENES_POR_COLUMNA = 36;

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function minutosActuales(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function horaEnMinutos(hora: string | null): number | null {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

function esTarde(a: ActividadHogar): boolean {
  const min = horaEnMinutos(a.hora);
  return min !== null && min >= HORA_CORTE_TARDE * 60;
}

//texto que lee el parlante: "A las 10, reflexión, con vicky, en Templo."
function frase(a: ActividadHogar): string {
  const min = horaEnMinutos(a.hora);
  const cuando = min === null ? 'Horario a coordinar' : `A las ${Math.floor(min / 60)}${min % 60 ? ` y ${min % 60}` : ''}`;
  return [
    `${cuando}, ${a.nombre.toLowerCase()}`,
    a.tallerista ? `con ${a.tallerista.toLowerCase()}` : null,
    a.lugar ? `en ${a.lugar}` : null,
    a.suspendido ? 'esta actividad está suspendida' : null,
  ].filter(Boolean).join(', ') + '.';
}

//achica la letra solo si la palabra más larga no entra en la tarjeta (ej. RECREATIVAMENTE), para que no se corte
function tamanioNombre(nombre: string, anchoDisponible: number): number {
  const masLarga = Math.max(...nombre.split(/\s+/).map((p) => p.length), 1);
  const queEntra = Math.floor(anchoDisponible / (masLarga * 0.74));
  return Math.max(12, Math.min(19, queEntra));
}

interface TarjetaProps {
  actividad: ActividadHogar;
  enCurso: boolean;
  anchoNombre: number;
}

function Tarjeta({ actividad, enCurso, anchoNombre }: TarjetaProps) {
  const color = esTarde(actividad) ? COLOR_TARDE : COLOR_MANANA;
  const size = tamanioNombre(actividad.nombre, anchoNombre);
  return (
    <View style={[styles.tarjeta, actividad.suspendido && styles.tarjetaSuspendida]} accessible accessibilityLabel={frase(actividad)}>
      <View style={[styles.tarjetaHora, { backgroundColor: actividad.suspendido ? '#8A8A8A' : color }]}>
        <Text style={styles.tarjetaHoraTexto}>{actividad.horario}</Text>
      </View>
      <View style={[styles.tarjetaCuerpo, enCurso && { backgroundColor: FONDO_EN_CURSO }]}>
        <Text style={[styles.tarjetaNombre, { fontSize: size }, actividad.suspendido && styles.tachado]}>{actividad.nombre}</Text>
        {actividad.tallerista ? <Text style={styles.tarjetaTallerista}>{actividad.tallerista}</Text> : null}
        {actividad.suspendido ? <Text style={styles.suspendida}>SUSPENDIDA</Text> : null}
      </View>
      <View style={styles.tarjetaLugar}>
        <Ionicons name="location-outline" size={16} color="#FFFFFF" />
        <Text style={styles.tarjetaLugarTexto} numberOfLines={2}>{actividad.lugar ?? 'A coordinar'}</Text>
      </View>
    </View>
  );
}

export default function HorariosHogarScreen() {
  const { data, isLoading, error, refetch } = useHorariosHogar();
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const [offset, setOffset] = useState(0);
  const [pisoElegido, setPisoElegido] = useState<string | null>(null);
  //minutos desde las 00:00, se actualiza cada minuto para que "en curso" y la actividad siguiente avancen solos
  const [ahoraMin, setAhoraMin] = useState(minutosActuales);

  useEffect(() => {
    const t = setInterval(() => setAhoraMin(minutosActuales()), 60_000);
    return () => clearInterval(t);
  }, []);

  const miSeccion = profile?.residente?.seccion ?? null;
  const esEmpleado = miSeccion === SECCION_EMPLEADO;
  const miSector = esEmpleado ? null : sectorDeMiPiso(miSeccion);
  //el residente solo ve su piso si ese piso existe en la grilla del hogar; si no, ve todo
  const filtrarPorMiPiso = !!miSector && (data?.actividades ?? []).some((a) => perteneceAlSector(a.sectores, miSector));
  const sectorElegido = esEmpleado && pisoElegido ? sectorDeMiPiso(pisoElegido) : null;
  const sectorFiltro = filtrarPorMiPiso ? miSector : sectorElegido;

  const pisos = useMemo(() => {
    const todos = new Set<string>();
    (data?.actividades ?? []).forEach((a) => a.sectores.forEach((s) => todos.add(s)));
    return [...todos].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }, [data]);

  const fecha = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);
  const nombreDia = DIAS[fecha.getDay()];

  const actividades = useMemo(() => {
    const delDia = (data?.actividades ?? []).filter(
      (a) =>
        sinTildes(a.dia) === sinTildes(nombreDia) &&
        //una actividad sin sectores es para todo el hogar
        (!sectorFiltro || a.sectores.length === 0 || perteneceAlSector(a.sectores, sectorFiltro)),
    );
    return delDia.sort((a, b) => (horaEnMinutos(a.hora) ?? 9999) - (horaEnMinutos(b.hora) ?? 9999));
  }, [data, nombreDia, sectorFiltro]);

  const esHoy = offset === 0;
  //en curso: ya empezó y no pasó la hora de duración. Solo esas van en amarillo.
  const enCurso = (a: ActividadHogar) => {
    const inicio = horaEnMinutos(a.hora);
    return esHoy && !a.suspendido && inicio !== null && inicio <= ahoraMin && ahoraMin < inicio + DURACION_MIN;
  };
  //la que está pasando o, si no hay ninguna, la próxima: hacia ahí baja la lista al abrir
  const idSiguiente = useMemo(() => {
    if (!esHoy) return null;
    const sig = actividades.find((a) => {
      const inicio = horaEnMinutos(a.hora);
      return !a.suspendido && inicio !== null && inicio + DURACION_MIN > ahoraMin;
    });
    return sig?.id ?? null;
  }, [actividades, esHoy, ahoraMin]);

  //scroll automático hasta la actividad siguiente (o arriba si se mira otro día)
  const scrollRef = useRef<ScrollView>(null);
  const yGrilla = useRef(0);
  const yCeldas = useRef<Record<number, number>>({});
  useEffect(() => {
    const t = setTimeout(() => {
      const y = idSiguiente !== null ? (yCeldas.current[idSiguiente] ?? null) : null;
      scrollRef.current?.scrollTo({ y: y !== null ? Math.max(0, yGrilla.current + y - 8) : 0, animated: true });
    }, 250);
    return () => clearTimeout(t);
  }, [idSiguiente, offset, sectorFiltro, isLoading]);

  const fechaTexto = `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  const textoHablar = actividades.length
    ? `Actividades del ${nombreDia}. ${actividades.map(frase).join(' ')}`
    : `No hay actividades el ${nombreDia}.`;
  const anchoNombre = Math.min(width, ANCHO_MAXIMO) / 2 - MARGENES_POR_COLUMNA;

  return (
    <View style={styles.root}>
      <AppHeader titulo="Horarios" mostrarVolver textoHablar={textoHablar} backgroundColor={Colors.brand.red} />

      {isLoading ? (
        <LoadingState mensaje="Cargando actividades..." />
      ) : error || !data ? (
        <ErrorState
          mensaje={error instanceof Error ? error.message : 'No se pudieron cargar las actividades.'}
          onReintentar={refetch}
        />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.contenido}>
            <View style={styles.cabecera}>
              <View style={styles.diaFila}>
                <TouchableOpacity style={styles.flecha} onPress={() => setOffset((o) => o - 1)} accessibilityRole="button" accessibilityLabel="Día anterior">
                  <Ionicons name="chevron-back" size={28} color={COLOR_TITULO} />
                </TouchableOpacity>
                <Text style={styles.diaTexto} adjustsFontSizeToFit numberOfLines={1}>{nombreDia.toUpperCase()}</Text>
                <TouchableOpacity style={styles.flecha} onPress={() => setOffset((o) => o + 1)} accessibilityRole="button" accessibilityLabel="Día siguiente">
                  <Ionicons name="chevron-forward" size={28} color={COLOR_TITULO} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fechaTexto}>{fechaTexto}</Text>
              {!esHoy ? (
                <TouchableOpacity onPress={() => setOffset(0)} style={styles.volverHoy} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
                  <Text style={styles.volverHoyTexto}>Volver a hoy</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {esEmpleado ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsPiso} contentContainerStyle={styles.chipsPisoContenido}>
                {[null, ...pisos].map((p) => (
                  <TouchableOpacity
                    key={p ?? 'todo'}
                    style={[styles.chipPiso, pisoElegido === p && styles.chipPisoActivo]}
                    onPress={() => setPisoElegido(p)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pisoElegido === p }}
                  >
                    <Text style={[styles.chipPisoTexto, pisoElegido === p && styles.chipPisoTextoActivo]}>{p ?? 'Todo el hogar'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {actividades.length === 0 ? (
              <View style={styles.vacio}>
                <Text style={styles.vacioEmoji}>📭</Text>
                <Text style={styles.vacioTexto}>No hay actividades para este día.</Text>
              </View>
            ) : (
              <View style={styles.grilla} onLayout={(e) => { yGrilla.current = e.nativeEvent.layout.y; }}>
                {actividades.map((a) => (
                  <View key={a.id} style={styles.celda} onLayout={(e) => { yCeldas.current[a.id] = e.nativeEvent.layout.y; }}>
                    <Tarjeta actividad={a} enCurso={enCurso(a)} anchoNombre={anchoNombre} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  scroll: { alignItems: 'center', paddingBottom: 24 },
  contenido: { width: '100%', maxWidth: ANCHO_MAXIMO },

  cabecera: { backgroundColor: '#FFFFFF', alignItems: 'center', paddingTop: 6, paddingBottom: 10, paddingHorizontal: 12 },
  diaFila: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  flecha: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  diaTexto: { flexShrink: 1, fontSize: 34, fontWeight: '900', fontStyle: 'italic', color: COLOR_TITULO, textAlign: 'center' },
  fechaTexto: { fontSize: 18, color: Colors.text.primary },
  volverHoy: { marginTop: 6, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.brand.primary },
  volverHoyTexto: { fontSize: 16, fontWeight: '700', color: Colors.brand.primary },

  chipsPiso: { flexGrow: 0, marginTop: 10 },
  chipsPisoContenido: { paddingHorizontal: 12, gap: 8 },
  chipPiso: { minHeight: 44, minWidth: 64, paddingHorizontal: 14, borderRadius: 12, borderWidth: 2, borderColor: Colors.brand.primary, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  chipPisoActivo: { backgroundColor: Colors.brand.primary },
  chipPisoTexto: { fontSize: 17, fontWeight: '700', color: Colors.brand.primary },
  chipPisoTextoActivo: { color: '#FFFFFF' },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 10 },
  celda: { width: '50%', padding: 6 },

  tarjeta: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tarjetaSuspendida: { opacity: 0.85 },
  tarjetaHora: { paddingVertical: 6, alignItems: 'center' },
  tarjetaHoraTexto: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  tarjetaCuerpo: { flex: 1, minHeight: 80, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 10, gap: 4 },
  tarjetaNombre: { fontWeight: '800', color: COLOR_TEXTO, textAlign: 'center' },
  tachado: { textDecorationLine: 'line-through' },
  tarjetaTallerista: { fontSize: 17, fontWeight: '700', color: COLOR_TALLERISTA, textAlign: 'center' },
  suspendida: { fontSize: 17, fontWeight: '800', color: Colors.brand.red },
  tarjetaLugar: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.brand.primary, paddingHorizontal: 8, paddingVertical: 8, minHeight: 40 },
  tarjetaLugarTexto: { flex: 1, fontSize: 17, fontWeight: '600', color: '#FFFFFF' },

  vacio: { alignItems: 'center', gap: 10, padding: 32 },
  vacioEmoji: { fontSize: 44 },
  vacioTexto: { fontSize: 19, textAlign: 'center', color: Colors.text.primary },
});
