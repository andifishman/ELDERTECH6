// Agenda — pantalla principal: calendario (mes/semana), Hoy y Próximos
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import {
  useAgendaHoy,
  useAgendaMes,
  useAgendaProximos,
  useAgendaSemana,
  useCambiarEstadoRecordatorio,
} from '@/hooks/useAgenda';
import type { EstadoRecordatorio, Recordatorio } from '@/services/agendaService';
import { esMismodia, getLabelDia } from '@/utils/dateUtils';
import {
  addDias,
  DIAS_COMPLETO_LUNES_PRIMERO,
  DIAS_LETRA_LUNES_PRIMERO as DIAS_LETRA,
  diasDeLaSemana,
  formatearFechaLegible,
  generarGrillaMes,
  lunesDeLaSemana,
  nombreMes,
  toISODate,
} from '@/utils/agendaDateUtils';

type Vista = 'mes' | 'semana' | 'hoy' | 'proximos';

const PRIORIDAD_COLOR: Record<Recordatorio['prioridad'], string> = Colors.agenda.prioridad;
const PRIORIDAD_ORDEN: Record<Recordatorio['prioridad'], number> = { urgente: 4, alta: 3, media: 2, baja: 1 };
const ESTADO_LABEL: Record<EstadoRecordatorio, string> = {
  pendiente: 'Pendiente',
  realizado: 'Realizado',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};
const ESTADO_COLOR: Record<EstadoRecordatorio, { bg: string; color: string }> = {
  pendiente: { bg: '#E3F2FD', color: '#0D47A1' },
  realizado: { bg: '#E8F5E9', color: '#1B5E3B' },
  vencido: { bg: '#FFEBEE', color: '#C62828' },
  cancelado: { bg: '#F5F5F5', color: '#757575' },
};
function colorDominante(eventos: Recordatorio[]): string {
  const top = eventos.reduce((a, b) => (PRIORIDAD_ORDEN[b.prioridad] > PRIORIDAD_ORDEN[a.prioridad] ? b : a));
  return top.color || PRIORIDAD_COLOR[top.prioridad];
}

function agruparPorFecha(eventos: Recordatorio[]): Map<string, Recordatorio[]> {
  const mapa = new Map<string, Recordatorio[]>();
  for (const e of eventos) {
    const lista = mapa.get(e.fecha) ?? [];
    lista.push(e);
    mapa.set(e.fecha, lista);
  }
  return mapa;
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const hoy = useMemo(() => new Date(), []);
  const [vista, setVista] = useState<Vista>('mes');
  const [mesRef, setMesRef] = useState(hoy);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(toISODate(hoy));

  const fechaRefISO = toISODate(mesRef);
  const { data: eventosMes = [], isLoading: cargandoMes } = useAgendaMes(fechaRefISO);
  const { data: eventosSemana = [], isLoading: cargandoSemana } = useAgendaSemana(fechaRefISO);
  const { data: eventosHoy = [], isLoading: cargandoHoy } = useAgendaHoy();
  const { data: proximos = [], isLoading: cargandoProximos } = useAgendaProximos(30);
  const cambiarEstado = useCambiarEstadoRecordatorio();

  const eventosPorDia = useMemo(() => agruparPorFecha(eventosMes), [eventosMes]);
  const eventosSemanaPorDia = useMemo(() => agruparPorFecha(eventosSemana), [eventosSemana]);
  const grilla = useMemo(() => generarGrillaMes(mesRef), [mesRef]);
  const eventosDelDiaSeleccionado = eventosPorDia.get(diaSeleccionado) ?? [];

  function cambiarMes(delta: number) {
    setMesRef((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function marcarRealizado(id: string) {
    cambiarEstado.mutate({ id, estado: 'realizado' });
  }

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Agenda"
        mostrarVolver
        backgroundColor={Colors.agenda.accent}
        textoHablar="Agenda. Tus recordatorios personales. Tocá el botón verde para agregar uno nuevo."
      />

      {/* Selector de vista */}
      <View style={styles.tabsRow}>
            {([
              ['mes', 'Mes'],
              ['semana', 'Semana'],
              ['hoy', 'Hoy'],
              ['proximos', 'Próximos'],
            ] as [Vista, string][]).map(([v, label]) => (
              <TouchableOpacity
                key={v}
                style={[styles.tab, vista === v && styles.tabActivo]}
                onPress={() => setVista(v)}
                accessibilityRole="button"
                accessibilityState={{ selected: vista === v }}
              >
                <Text style={[styles.tabTexto, vista === v && styles.tabTextoActivo]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={[styles.listaContent, { paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
            {vista === 'mes' && (
              <>
                <View style={styles.mesNavRow}>
                  <TouchableOpacity onPress={() => cambiarMes(-1)} accessibilityLabel="Mes anterior" style={styles.mesNavBtn}>
                    <Ionicons name="chevron-back" size={26} color={Colors.agenda.accent} />
                  </TouchableOpacity>
                  <Text style={styles.mesNombre}>{nombreMes(mesRef.getMonth())} {mesRef.getFullYear()}</Text>
                  <TouchableOpacity onPress={() => cambiarMes(1)} accessibilityLabel="Mes siguiente" style={styles.mesNavBtn}>
                    <Ionicons name="chevron-forward" size={26} color={Colors.agenda.accent} />
                  </TouchableOpacity>
                </View>

                <View style={styles.diasSemanaRow}>
                  {DIAS_LETRA.map((d, i) => (
                    <Text key={i} style={styles.diaSemanaLetra}>{d}</Text>
                  ))}
                </View>

                {cargandoMes ? (
                  <Cargando texto="Cargando calendario..." />
                ) : (
                  <View style={styles.grillaMes}>
                    {grilla.map(({ fecha, enMes, dia }) => {
                      const eventosDia = eventosPorDia.get(fecha) ?? [];
                      const esHoy = esMismodia(new Date(`${fecha}T00:00:00`), hoy);
                      const seleccionado = fecha === diaSeleccionado;
                      return (
                        <TouchableOpacity
                          key={fecha}
                          style={[
                            styles.celdaDia,
                            seleccionado && styles.celdaDiaSeleccionada,
                            esHoy && !seleccionado && styles.celdaDiaHoy,
                          ]}
                          onPress={() => setDiaSeleccionado(fecha)}
                          accessibilityLabel={`Día ${dia}${eventosDia.length ? `, ${eventosDia.length} recordatorio${eventosDia.length > 1 ? 's' : ''}` : ''}`}
                        >
                          <Text
                            style={[
                              styles.celdaDiaTexto,
                              !enMes && styles.celdaDiaTextoAfuera,
                              seleccionado && styles.celdaDiaTextoSeleccionado,
                              esHoy && !seleccionado && { color: Colors.agenda.accentDark, fontWeight: Typography.weight.bold },
                            ]}
                          >
                            {dia}
                          </Text>
                          {eventosDia.length > 0 && (
                            <View style={[styles.puntoEvento, { backgroundColor: seleccionado ? Colors.text.onDark : colorDominante(eventosDia) }]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.seccionTitulo}>
                  {esMismodia(new Date(`${diaSeleccionado}T00:00:00`), hoy) ? 'Hoy' : formatearFechaLegible(diaSeleccionado)}
                </Text>
                {eventosDelDiaSeleccionado.length === 0 ? (
                  <EstadoVacio emoji="📅" texto="No hay recordatorios este día." />
                ) : (
                  eventosDelDiaSeleccionado.map((r) => (
                    <TarjetaRecordatorio key={r.id} recordatorio={r} onMarcarRealizado={() => marcarRealizado(r.id)} />
                  ))
                )}
              </>
            )}

            {vista === 'semana' && (
              <>
                <View style={styles.mesNavRow}>
                  <TouchableOpacity onPress={() => setMesRef((p) => addDias(p, -7))} accessibilityLabel="Semana anterior" style={styles.mesNavBtn}>
                    <Ionicons name="chevron-back" size={26} color={Colors.agenda.accent} />
                  </TouchableOpacity>
                  <Text style={styles.mesNombre}>Semana del {formatearFechaLegible(toISODate(lunesDeLaSemana(mesRef)))}</Text>
                  <TouchableOpacity onPress={() => setMesRef((p) => addDias(p, 7))} accessibilityLabel="Semana siguiente" style={styles.mesNavBtn}>
                    <Ionicons name="chevron-forward" size={26} color={Colors.agenda.accent} />
                  </TouchableOpacity>
                </View>

                {cargandoSemana ? (
                  <Cargando texto="Cargando semana..." />
                ) : (
                  diasDeLaSemana(mesRef).map((d) => {
                    const fecha = toISODate(d);
                    const eventosDia = eventosSemanaPorDia.get(fecha) ?? [];
                    const esHoy = esMismodia(d, hoy);
                    return (
                      <View key={fecha} style={styles.diaSemanaSeccion}>
                        <View style={styles.diaSemanaHeader}>
                          <Text style={[styles.diaSemanaHeaderTexto, esHoy && { color: Colors.agenda.accentDark }]}>
                            {DIAS_COMPLETO_LUNES_PRIMERO[d.getDay() === 0 ? 6 : d.getDay() - 1]} {d.getDate()} {esHoy ? '· Hoy' : ''}
                          </Text>
                        </View>
                        {eventosDia.length === 0 ? (
                          <Text style={styles.sinEventosTexto}>Sin recordatorios</Text>
                        ) : (
                          eventosDia.map((r) => (
                            <TarjetaRecordatorio key={r.id} recordatorio={r} onMarcarRealizado={() => marcarRealizado(r.id)} compacta />
                          ))
                        )}
                      </View>
                    );
                  })
                )}
              </>
            )}

            {vista === 'hoy' && (
              <>
                <Text style={styles.seccionTitulo}>Hoy, {formatearFechaLegible(toISODate(hoy))}</Text>
                {cargandoHoy ? (
                  <Cargando texto="Cargando recordatorios de hoy..." />
                ) : eventosHoy.length === 0 ? (
                  <EstadoVacio emoji="👍" texto="No tenés recordatorios para hoy." />
                ) : (
                  eventosHoy.map((r) => <TarjetaRecordatorio key={r.id} recordatorio={r} onMarcarRealizado={() => marcarRealizado(r.id)} />)
                )}
              </>
            )}

            {vista === 'proximos' && (
              <>
                <Text style={styles.seccionTitulo}>Próximos recordatorios</Text>
                {cargandoProximos ? (
                  <Cargando texto="Cargando próximos recordatorios..." />
                ) : proximos.length === 0 ? (
                  <EstadoVacio emoji="✅" texto="No tenés recordatorios pendientes." />
                ) : (
                  proximos.map((r) => (
                    <View key={r.id}>
                      <Text style={styles.proximoFechaLabel}>{getLabelDia(new Date(`${r.fecha}T00:00:00`), hoy)}</Text>
                      <TarjetaRecordatorio recordatorio={r} onMarcarRealizado={() => marcarRealizado(r.id)} />
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>

      <TouchableOpacity
        style={[styles.nuevoBtn, { bottom: insets.bottom + Spacing.lg }]}
        onPress={() => router.push('/agenda/nuevo')}
        accessibilityRole="button"
        accessibilityLabel="Nuevo recordatorio"
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.text.onDark} />
        <Text style={styles.nuevoBtnTexto}>Nuevo recordatorio</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Tarjeta de recordatorio (reusada en todas las vistas) ─────────────────────

function TarjetaRecordatorio({
  recordatorio,
  onMarcarRealizado,
  compacta,
}: {
  recordatorio: Recordatorio;
  onMarcarRealizado: () => void;
  compacta?: boolean;
}) {
  const color = recordatorio.color || PRIORIDAD_COLOR[recordatorio.prioridad];
  const estadoInfo = ESTADO_COLOR[recordatorio.estado];

  return (
    <TouchableOpacity
      style={[styles.tarjeta, compacta && styles.tarjetaCompacta]}
      onPress={() => router.push(`/agenda/${recordatorio.id}` as never)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${recordatorio.titulo}${recordatorio.hora ? `, ${recordatorio.hora.slice(0, 5)}` : ''}`}
    >
      <View style={[styles.tarjetaBarra, { backgroundColor: color }]} />
      <View style={styles.tarjetaIconoWrap}>
        <Text style={styles.tarjetaIcono}>{recordatorio.icono || '📌'}</Text>
      </View>
      <View style={styles.tarjetaInfo}>
        <Text style={styles.tarjetaTitulo} numberOfLines={1}>{recordatorio.titulo}</Text>
        <Text style={styles.tarjetaSubtexto}>
          {recordatorio.hora ? recordatorio.hora.slice(0, 5) : 'Todo el día'}
          {recordatorio.recurrencia_tipo !== 'ninguna' ? ' · 🔁' : ''}
          {recordatorio.tipo_contenido !== 'texto' ? ' · 🎤' : ''}
        </Text>
        <View style={[styles.estadoBadge, { backgroundColor: estadoInfo.bg }]}>
          <Text style={[styles.estadoBadgeTexto, { color: estadoInfo.color }]}>{ESTADO_LABEL[recordatorio.estado]}</Text>
        </View>
      </View>
      {recordatorio.estado === 'pendiente' && (
        <TouchableOpacity
          style={styles.marcarBtn}
          onPress={onMarcarRealizado}
          accessibilityRole="button"
          accessibilityLabel="Marcar como realizado"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="checkmark-circle-outline" size={30} color={Colors.brand.greenDark} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function EstadoVacio({ emoji, texto }: { emoji: string; texto: string }) {
  return (
    <View style={styles.vacioContainer}>
      <Text style={styles.vacioEmoji}>{emoji}</Text>
      <Text style={styles.vacioTexto}>{texto}</Text>
    </View>
  );
}

function Cargando({ texto = 'Cargando...' }: { texto?: string }) {
  return (
    <View style={styles.cargandoBox}>
      <ActivityIndicator color={Colors.agenda.accent} />
      <Text style={styles.cargandoTexto}>{texto}</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
  },
  tabActivo: { backgroundColor: Colors.agenda.accent },
  tabTexto: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.secondary },
  tabTextoActivo: { color: Colors.text.onDark },

  listaContent: { padding: Spacing.screen.horizontal, paddingBottom: Spacing.xxxl, gap: Spacing.sm },

  mesNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  mesNavBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mesNombre: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },

  diasSemanaRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  diaSemanaLetra: { flex: 1, textAlign: 'center', fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.hint },

  grillaMes: { flexDirection: 'row', flexWrap: 'wrap' },
  celdaDia: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.radius.md,
    marginBottom: 2,
    gap: 3,
  },
  celdaDiaSeleccionada: { backgroundColor: Colors.agenda.accent },
  celdaDiaHoy: { borderWidth: 2, borderColor: Colors.agenda.accent },
  celdaDiaTexto: { fontSize: Typography.size.md, color: Colors.text.primary },
  celdaDiaTextoAfuera: { color: Colors.text.hint },
  celdaDiaTextoSeleccionado: { color: Colors.text.onDark, fontWeight: Typography.weight.bold },
  puntoEvento: { width: 6, height: 6, borderRadius: 3 },

  seccionTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  diaSemanaSeccion: { marginBottom: Spacing.md },
  diaSemanaHeader: { marginBottom: Spacing.xs },
  diaSemanaHeaderTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  sinEventosTexto: { fontSize: Typography.size.sm, color: Colors.text.hint, fontStyle: 'italic', marginBottom: Spacing.xs },

  proximoFechaLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.agenda.accentDark,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },

  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    overflow: 'hidden',
    minHeight: Spacing.touch.large,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  tarjetaCompacta: { minHeight: Spacing.touch.comfortable },
  tarjetaBarra: { width: 6, alignSelf: 'stretch' },
  tarjetaIconoWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ui.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  tarjetaIcono: { fontSize: 24 },
  tarjetaInfo: { flex: 1, paddingVertical: Spacing.sm, gap: 4 },
  tarjetaTitulo: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  tarjetaSubtexto: { fontSize: Typography.size.sm, color: Colors.text.hint },
  estadoBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Spacing.radius.full },
  estadoBadgeTexto: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  marcarBtn: { paddingHorizontal: Spacing.md },

  vacioContainer: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  vacioEmoji: { fontSize: 48 },
  vacioTexto: { fontSize: Typography.size.md, color: Colors.text.hint, textAlign: 'center' },

  cargandoBox: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  cargandoTexto: { fontSize: Typography.size.md, color: Colors.text.secondary, fontWeight: Typography.weight.semibold },

  nuevoBtn: {
    position: 'absolute',
    left: Spacing.screen.horizontal,
    right: Spacing.screen.horizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.greenDark,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  nuevoBtnTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
});
