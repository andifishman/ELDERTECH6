//pantalla de Horarios con las actividades del Hogar (vienen del sistema del hogar, vía nuestro backend).
//un día a la vez, tarjetas de mañana (verde azulado) y tarde (naranja), y botón para escucharlas
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState, LoadingState } from '@/components/common/LoadingState';
import { useHorariosHogar } from '@/hooks/useHorariosHogar';
import { Colors } from '@/constants/Colors';
import { hablar } from '@/utils/tts';
import type { ActividadHogar } from '@/services/horariosHogarService';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const COLOR_MANANA = '#1E9A9A';
const COLOR_TARDE = '#F08030';
const COLOR_TITULO = '#1F3A6E';
const COLOR_TEXTO = '#2D1B4E';
const FONDO_AHORA = '#F5EBCB';
//desde esta hora la actividad cuenta como "tarde" (igual que en Horarios propios)
const HORA_CORTE_TARDE = 13;
//una actividad se considera "en curso" hasta una hora después de su inicio
const DURACION_MIN = 60;

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function horaEnMinutos(hora: string | null): number | null {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

function esTarde(a: ActividadHogar): boolean {
  const min = horaEnMinutos(a.hora);
  return min !== null && min >= HORA_CORTE_TARDE * 60;
}

function etiquetaRelativa(offset: number): string {
  if (offset === 0) return ' · Hoy';
  if (offset === 1) return ' · Mañana';
  if (offset === -1) return ' · Ayer';
  return '';
}

//texto que lee el botón de voz: "A las 10, Reflexión con Vicky, en el Templo."
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

function Tarjeta({ actividad, ahora }: { actividad: ActividadHogar; ahora: boolean }) {
  const color = esTarde(actividad) ? COLOR_TARDE : COLOR_MANANA;
  return (
    <View
      style={[styles.tarjeta, actividad.suspendido && styles.tarjetaSuspendida]}
      accessible
      accessibilityLabel={frase(actividad)}
    >
      <View style={[styles.tarjetaHora, { backgroundColor: actividad.suspendido ? Colors.ui.disabled : color }]}>
        <Text style={styles.tarjetaHoraTexto}>{actividad.horario}</Text>
      </View>
      <View style={[styles.tarjetaCuerpo, ahora && !actividad.suspendido && { backgroundColor: FONDO_AHORA }]}>
        <Text style={[styles.tarjetaNombre, actividad.suspendido && styles.tachado]}>{actividad.nombre}</Text>
        {actividad.tallerista ? <Text style={styles.tarjetaTallerista}>{actividad.tallerista}</Text> : null}
        {actividad.suspendido ? <Text style={styles.suspendida}>SUSPENDIDA</Text> : null}
      </View>
      <View style={styles.tarjetaLugar}>
        <Ionicons name="location-outline" size={18} color="#FFFFFF" />
        <Text style={styles.tarjetaLugarTexto} numberOfLines={2}>{actividad.lugar ?? 'A coordinar'}</Text>
      </View>
    </View>
  );
}

export default function HorariosHogarScreen() {
  const { data, isLoading, error, refetch } = useHorariosHogar();
  const [offset, setOffset] = useState(0);

  const fecha = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);
  const nombreDia = DIAS[fecha.getDay()];

  const actividades = useMemo(() => {
    const delDia = (data?.actividades ?? []).filter((a) => sinTildes(a.dia) === sinTildes(nombreDia));
    return delDia.sort((a, b) => (horaEnMinutos(a.hora) ?? 9999) - (horaEnMinutos(b.hora) ?? 9999));
  }, [data, nombreDia]);

  //el cartel beige marca la actividad que está pasando ahora o, si no hay, la próxima (solo en el día de hoy)
  const idAhora = useMemo(() => {
    if (offset !== 0) return null;
    const ahora = new Date();
    const min = ahora.getHours() * 60 + ahora.getMinutes();
    const actual = actividades.find((a) => {
      const inicio = horaEnMinutos(a.hora);
      return !a.suspendido && inicio !== null && inicio + DURACION_MIN > min;
    });
    return actual?.id ?? null;
  }, [actividades, offset]);

  const fechaTexto = `${fecha.getDate()} de ${MESES[fecha.getMonth()]}${etiquetaRelativa(offset)}`;
  const textoHablar = actividades.length
    ? `Actividades del ${nombreDia}. ${actividades.map(frase).join(' ')}`
    : `No hay actividades el ${nombreDia}.`;

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
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cabecera}>
              <Text style={styles.cabeceraChico}>ACTIVIDADES</Text>
              <View style={styles.diaFila}>
                <TouchableOpacity
                  style={styles.flecha}
                  onPress={() => setOffset((o) => o - 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Día anterior"
                >
                  <Ionicons name="chevron-back" size={30} color={COLOR_TITULO} />
                </TouchableOpacity>
                <Text style={styles.diaTexto} adjustsFontSizeToFit numberOfLines={1}>{nombreDia.toUpperCase()}</Text>
                <TouchableOpacity
                  style={styles.flecha}
                  onPress={() => setOffset((o) => o + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Día siguiente"
                >
                  <Ionicons name="chevron-forward" size={30} color={COLOR_TITULO} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fechaTexto}>{fechaTexto}</Text>
              {offset !== 0 ? (
                <TouchableOpacity onPress={() => setOffset(0)} style={styles.volverHoy} accessibilityRole="button">
                  <Text style={styles.volverHoyTexto}>Volver a hoy</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.leyenda}>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaPunto, { backgroundColor: COLOR_MANANA }]} />
                <Text style={styles.leyendaTexto}>Mañana</Text>
              </View>
              <View style={styles.leyendaItem}>
                <View style={[styles.leyendaPunto, { backgroundColor: COLOR_TARDE }]} />
                <Text style={styles.leyendaTexto}>Tarde</Text>
              </View>
            </View>

            {actividades.length === 0 ? (
              <View style={styles.vacio}>
                <Text style={styles.vacioEmoji}>📭</Text>
                <Text style={styles.vacioTexto}>No hay actividades para este día.</Text>
              </View>
            ) : (
              <View style={styles.grilla}>
                {actividades.map((a) => (
                  <View key={a.id} style={styles.celda}>
                    <Tarjeta actividad={a} ahora={a.id === idAhora} />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.pie}>
            <TouchableOpacity
              style={styles.botonEscuchar}
              onPress={() => void hablar(textoHablar)}
              accessibilityRole="button"
              accessibilityLabel={offset === 0 ? 'Escuchar las actividades de hoy' : `Escuchar las actividades del ${nombreDia}`}
            >
              <Ionicons name="volume-medium" size={24} color="#FFFFFF" />
              <Text style={styles.botonEscucharTexto}>
                {offset === 0 ? 'Escuchar las actividades de hoy' : `Escuchar las actividades del ${nombreDia.toLowerCase()}`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  scroll: { paddingBottom: 16 },

  cabecera: { backgroundColor: '#FFFFFF', alignItems: 'center', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 12 },
  cabeceraChico: { fontSize: 15, letterSpacing: 3, color: Colors.text.hint, fontWeight: '600' },
  diaFila: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  flecha: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  diaTexto: { flexShrink: 1, fontSize: 48, fontWeight: '900', fontStyle: 'italic', color: COLOR_TITULO, textAlign: 'center' },
  fechaTexto: { fontSize: 19, color: Colors.text.primary, marginTop: 2 },
  volverHoy: { marginTop: 10, minHeight: 48, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 24, borderWidth: 2, borderColor: Colors.brand.primary },
  volverHoyTexto: { fontSize: 18, fontWeight: '700', color: Colors.brand.primary },

  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingVertical: 14 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leyendaPunto: { width: 16, height: 16, borderRadius: 4 },
  leyendaTexto: { fontSize: 18, color: COLOR_TEXTO },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  celda: { width: '50%', padding: 6 },

  tarjeta: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tarjetaSuspendida: { opacity: 0.8 },
  tarjetaHora: { paddingVertical: 10, alignItems: 'center' },
  tarjetaHoraTexto: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  tarjetaCuerpo: { flex: 1, minHeight: 110, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 14, gap: 6 },
  tarjetaNombre: { fontSize: 21, fontWeight: '800', color: COLOR_TEXTO, textAlign: 'center' },
  tachado: { textDecorationLine: 'line-through' },
  tarjetaTallerista: { fontSize: 17, fontWeight: '600', color: Colors.text.hint, textAlign: 'center', textTransform: 'uppercase' },
  suspendida: { fontSize: 17, fontWeight: '800', color: Colors.brand.red },
  tarjetaLugar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.brand.primary, paddingHorizontal: 10, paddingVertical: 12, minHeight: 48 },
  tarjetaLugarTexto: { flex: 1, fontSize: 17, fontWeight: '600', color: '#FFFFFF' },

  vacio: { alignItems: 'center', gap: 12, padding: 32 },
  vacioEmoji: { fontSize: 52 },
  vacioTexto: { fontSize: 20, textAlign: 'center', color: Colors.text.primary },

  pie: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16, backgroundColor: Colors.ui.background },
  botonEscuchar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 60, borderRadius: 18, backgroundColor: Colors.brand.primary, paddingHorizontal: 16 },
  botonEscucharTexto: { flexShrink: 1, fontSize: 19, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
});
