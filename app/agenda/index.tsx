// Agenda — pantalla principal: calendario (mes/semana), Hoy y Próximos
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
  useEliminarRecordatorio,
} from '@/hooks/useAgenda';
import type { EstadoRecordatorio, Recordatorio } from '@/services/agendaService';
import { esMismodia } from '@/utils/dateUtils';
import {
  addDias,
  DIAS_LETRA_LUNES_PRIMERO as DIAS_LETRA,
  diasDeLaSemana,
  formatearFechaCompleta,
  formatearFechaLegible,
  generarGrillaMes,
  lunesDeLaSemana,
  nombreMes,
  toISODate,
} from '@/utils/agendaDateUtils';

type Vista = 'mes' | 'semana' | 'hoy' | 'proximos';

const ESTADO_LABEL: Record<EstadoRecordatorio, string> = {
  pendiente: 'Pendiente',
  realizado: 'Realizado',
  vencido: 'Finalizado',
  cancelado: 'Cancelado',
};
const ESTADO_COLOR: Record<EstadoRecordatorio, { bg: string; color: string }> = {
  pendiente: { bg: '#E3F2FD', color: '#0D47A1' },
  realizado: { bg: '#E8F5E9', color: '#1B5E3B' },
  vencido: { bg: '#FFEBEE', color: '#C62828' },
  cancelado: { bg: '#F5F5F5', color: '#757575' },
};

// "Hoy" / "Mañana" o el día completo ("Viernes 28 de agosto") — se usa en la
// sección Próximos, donde nunca abreviamos el día ni el mes para que se lea
// de un vistazo.
function labelProximo(fechaISO: string, hoy: Date): string {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  if (esMismodia(fecha, hoy)) return 'Hoy';
  if (esMismodia(fecha, addDias(hoy, 1))) return 'Mañana';
  return formatearFechaCompleta(fechaISO);
}

// Cuántos recordatorios se muestran por día antes de tener que tocar "Ver todos" —
// evita listas larguísimas que obliguen a scrollear de más para ver el calendario.
const LIMITE_RECORDATORIOS_POR_DIA = 3;

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
  const { creado, fecha: fechaCreado } = useLocalSearchParams<{ creado?: string; fecha?: string }>();
  const hoy = useMemo(() => new Date(), []);
  const [vista, setVista] = useState<Vista>('mes');
  const [mesRef, setMesRef] = useState(hoy);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(toISODate(hoy));
  const [mostrarExito, setMostrarExito] = useState(false);
  const [verTodosDiaMes, setVerTodosDiaMes] = useState(false);
  const [verTodosHoy, setVerTodosHoy] = useState(false);
  const [diasExpandidosSemana, setDiasExpandidosSemana] = useState<Set<string>>(new Set());

  // Al elegir otro día en el calendario, el límite de "Ver todos" vuelve a
  // aplicarse — si no, quedaría expandido el día anterior por error.
  useEffect(() => {
    setVerTodosDiaMes(false);
  }, [diaSeleccionado]);

  // Al volver de "Nuevo recordatorio" con éxito: parar en el día del
  // recordatorio recién creado y mostrar un aviso de confirmación breve.
  useEffect(() => {
    if (creado !== '1') return;
    if (fechaCreado) {
      setDiaSeleccionado(fechaCreado);
      setMesRef(new Date(`${fechaCreado}T00:00:00`));
    }
    setVista('mes');
    setMostrarExito(true);
    const timer = setTimeout(() => setMostrarExito(false), 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creado]);

  const fechaRefISO = toISODate(mesRef);
  const { data: eventosMes = [], isLoading: cargandoMes } = useAgendaMes(fechaRefISO);
  const { data: eventosSemana = [], isLoading: cargandoSemana } = useAgendaSemana(fechaRefISO);
  const { data: eventosHoy = [], isLoading: cargandoHoy } = useAgendaHoy();
  const { data: proximos = [], isLoading: cargandoProximos } = useAgendaProximos(30);
  const eliminarRecordatorio = useEliminarRecordatorio();

  const eventosPorDia = useMemo(() => agruparPorFecha(eventosMes), [eventosMes]);
  const eventosSemanaPorDia = useMemo(() => agruparPorFecha(eventosSemana), [eventosSemana]);
  const grilla = useMemo(() => generarGrillaMes(mesRef), [mesRef]);
  const eventosDelDiaSeleccionado = eventosPorDia.get(diaSeleccionado) ?? [];

  function cambiarMes(delta: number) {
    setMesRef((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function irAEditar(id: string) {
    router.push(`/agenda/nuevo?editId=${id}` as never);
  }

  function pedirEliminar(r: Recordatorio) {
    Alert.alert(
      'Eliminar recordatorio',
      `¿Seguro que querés eliminar "${r.titulo}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarRecordatorio.mutateAsync(r.id);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'No se pudo eliminar el recordatorio.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Agenda"
        mostrarVolver
        backgroundColor={Colors.agenda.accent}
        textoHablar="Agenda. Tus recordatorios personales. Tocá el botón verde para agregar uno nuevo."
      />

      {mostrarExito && (
        <View style={styles.bannerExito} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={24} color={Colors.text.onDark} />
          <Text style={styles.bannerExitoTexto}>Recordatorio agregado</Text>
        </View>
      )}

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
                    <Text key={i} style={styles.diaSemanaLetra} maxFontSizeMultiplier={1.3}>{d}</Text>
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
                          style={styles.celdaDia}
                          onPress={() => setDiaSeleccionado(fecha)}
                          accessibilityLabel={`Día ${dia}${eventosDia.length ? `, ${eventosDia.length} recordatorio${eventosDia.length > 1 ? 's' : ''}` : ''}`}
                        >
                          <View
                            style={[
                              styles.celdaDiaInterior,
                              seleccionado && styles.celdaDiaSeleccionada,
                              esHoy && !seleccionado && styles.celdaDiaHoy,
                            ]}
                          >
                            <Text
                              style={[
                                styles.celdaDiaTexto,
                                !enMes && styles.celdaDiaTextoAfuera,
                                seleccionado && styles.celdaDiaTextoSeleccionado,
                                esHoy && !seleccionado && { color: Colors.agenda.accentDark, fontWeight: Typography.weight.bold },
                              ]}
                              // El círculo del día es chico y de tamaño fijo: con "Texto grande" del
                              // sistema alto, ni siquiera el tope de 1.3× alcanzaba — Android seguía
                              // dibujando el número más ancho de lo medido y se comía el segundo
                              // dígito. Es solo un número de 1-2 cifras, no pierde legibilidad sin
                              // escalar (el resto de la pantalla igual respeta la accesibilidad).
                              allowFontScaling={false}
                            >
                              {dia}
                            </Text>
                            {eventosDia.length > 0 && (
                              <View style={[styles.puntoEvento, { backgroundColor: seleccionado ? Colors.text.onDark : Colors.agenda.accent }]} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.seccionTitulo}>
                  {esMismodia(new Date(`${diaSeleccionado}T00:00:00`), hoy)
                    ? 'Recordatorios de hoy:'
                    : `Recordatorios del ${formatearFechaLegible(diaSeleccionado)}:`}
                </Text>
                {eventosDelDiaSeleccionado.length === 0 ? (
                  <EstadoVacio emoji="📅" texto="No hay recordatorios este día." />
                ) : (
                  <ListaRecordatorios
                    eventos={eventosDelDiaSeleccionado}
                    expandido={verTodosDiaMes}
                    onVerTodos={() => setVerTodosDiaMes(true)}
                    onEditar={irAEditar}
                    onEliminar={pedirEliminar}
                  />
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
                            {formatearFechaCompleta(fecha)} {esHoy ? '· Hoy' : ''}
                          </Text>
                        </View>
                        {eventosDia.length === 0 ? (
                          <Text style={styles.sinEventosTexto}>Sin recordatorios</Text>
                        ) : (
                          <ListaRecordatorios
                            eventos={eventosDia}
                            expandido={diasExpandidosSemana.has(fecha)}
                            onVerTodos={() => setDiasExpandidosSemana((prev) => new Set(prev).add(fecha))}
                            onEditar={irAEditar}
                            onEliminar={pedirEliminar}
                            compacta
                          />
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
                  <ListaRecordatorios
                    eventos={eventosHoy}
                    expandido={verTodosHoy}
                    onVerTodos={() => setVerTodosHoy(true)}
                    onEditar={irAEditar}
                    onEliminar={pedirEliminar}
                  />
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
                      <Text style={styles.proximoFechaLabel}>{labelProximo(r.fecha, hoy)}</Text>
                      <TarjetaRecordatorio
                        recordatorio={r}
                        onEditar={() => irAEditar(r.id)}
                        onEliminar={() => pedirEliminar(r)}
                      />
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>

      <TouchableOpacity
        style={[styles.nuevoBtn, { bottom: insets.bottom + Spacing.lg }]}
        onPress={() => router.push({ pathname: '/agenda/nuevo', params: { fecha: diaSeleccionado } })}
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

// ─── Lista de recordatorios de un día, con límite + "Ver todos" ────────────────

function ListaRecordatorios({
  eventos,
  expandido,
  onVerTodos,
  onEditar,
  onEliminar,
  compacta,
}: {
  eventos: Recordatorio[];
  expandido: boolean;
  onVerTodos: () => void;
  onEditar: (id: string) => void;
  onEliminar: (r: Recordatorio) => void;
  compacta?: boolean;
}) {
  // El backend ya devuelve los recordatorios de un día ordenados por hora
  // ascendente, así que los primeros N son directamente "los que pasan antes".
  const visibles = expandido ? eventos : eventos.slice(0, LIMITE_RECORDATORIOS_POR_DIA);
  const ocultos = eventos.length - visibles.length;

  return (
    <>
      {visibles.map((r) => (
        <TarjetaRecordatorio
          key={r.id}
          recordatorio={r}
          onEditar={() => onEditar(r.id)}
          onEliminar={() => onEliminar(r)}
          compacta={compacta}
        />
      ))}
      {ocultos > 0 && (
        <TouchableOpacity
          style={styles.verTodosBtn}
          onPress={onVerTodos}
          accessibilityRole="button"
          accessibilityLabel={`Ver todos los recordatorios, ${eventos.length} en total`}
        >
          <Text style={styles.verTodosBtnTexto}>Ver todos los recordatorios</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

// ─── Tarjeta de recordatorio (reusada en todas las vistas) ─────────────────────

function TarjetaRecordatorio({
  recordatorio,
  onEditar,
  onEliminar,
  compacta,
}: {
  recordatorio: Recordatorio;
  onEditar: () => void;
  onEliminar: () => void;
  compacta?: boolean;
}) {
  const estadoInfo = ESTADO_COLOR[recordatorio.estado];

  return (
    <View style={styles.tarjeta}>
      <View style={[styles.tarjetaTopRow, compacta && styles.tarjetaTopRowCompacta]}>
        <View style={[styles.tarjetaBarra, { backgroundColor: Colors.agenda.accent }]} />
        <View style={styles.tarjetaIconoWrap}>
          <Ionicons name="alarm-outline" size={22} color={Colors.agenda.accentDark} />
        </View>
        <View style={styles.tarjetaInfo}>
          <Text style={styles.tarjetaTitulo} numberOfLines={1} maxFontSizeMultiplier={1.3}>{recordatorio.titulo}</Text>
          <Text style={styles.tarjetaSubtexto} allowFontScaling={false}>{recordatorio.hora.slice(0, 5)}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoInfo.bg }]}>
            <Text style={[styles.estadoBadgeTexto, { color: estadoInfo.color }]}>{ESTADO_LABEL[recordatorio.estado]}</Text>
          </View>
        </View>
      </View>

      {/* 2 botones: eliminar y editar — reemplazan el toque sobre toda la
          tarjeta, que antes llevaba a una pantalla aparte. Sin botón de
          "Finalizar": los recordatorios pasan a "vencido" solos cuando llega
          su fecha y hora (cron de backend), sin necesidad de acción manual. */}
      <View style={styles.tarjetaAccionesRow}>
        <TouchableOpacity
          style={styles.accionBtn}
          onPress={onEliminar}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar recordatorio: ${recordatorio.titulo}`}
        >
          <Ionicons name="trash" size={24} color={Colors.brand.red} />
          <Text style={[styles.accionBtnTexto, { color: Colors.brand.red }]}>Eliminar</Text>
        </TouchableOpacity>

        <View style={styles.accionDivisor} />

        <TouchableOpacity
          style={styles.accionBtn}
          onPress={onEditar}
          accessibilityRole="button"
          accessibilityLabel={`Editar recordatorio: ${recordatorio.titulo}`}
        >
          <Ionicons name="pencil" size={24} color={Colors.agenda.accentDark} />
          <Text style={[styles.accionBtnTexto, { color: Colors.agenda.accentDark }]}>Editar</Text>
        </TouchableOpacity>
      </View>
    </View>
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

  bannerExito: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.greenDark,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bannerExitoTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },

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
  // Celda = solo área táctil (ocupa toda la columna, mantiene el toque ≥48pt).
  // El círculo/relleno visual va en celdaDiaInterior, más chico, para que
  // nunca toque al círculo del día de al lado.
  celdaDia: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    overflow: 'visible',
  },
  celdaDiaInterior: {
    width: '80%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.radius.md,
    gap: 3,
    // Reserva el mismo borde en todas las celdas (transparente por defecto)
    // para que marcar "hoy" no agrande el círculo — si solo celdaDiaHoy
    // tuviera borderWidth, ese círculo mediría más que el resto.
    borderWidth: 2,
    borderColor: 'transparent',
    // "Texto en negrita" de Android (Ajustes > Accesibilidad) dibuja el
    // número más ancho de lo que React Native midió — allowFontScaling en el
    // Text ya frena el tamaño, pero no ese engrosado (es otro eje del
    // sistema, aparte del tamaño de letra). overflow: 'visible' deja ver el
    // sobrante en vez de recortar el segundo dígito.
    overflow: 'visible',
  },
  celdaDiaSeleccionada: { backgroundColor: Colors.agenda.accent },
  celdaDiaHoy: { borderColor: Colors.agenda.accent },
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

  diaSemanaSeccion: { marginBottom: Spacing.md, gap: Spacing.sm },
  diaSemanaHeader: {},
  diaSemanaHeaderTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  sinEventosTexto: { fontSize: Typography.size.md, color: Colors.text.hint, fontStyle: 'italic' },

  proximoFechaLabel: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.agenda.accentDark,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  tarjeta: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  tarjetaTopRow: { flexDirection: 'row', alignItems: 'center', minHeight: Spacing.touch.large },
  tarjetaTopRowCompacta: { minHeight: Spacing.touch.comfortable },
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
  tarjetaInfo: { flex: 1, paddingVertical: Spacing.sm, gap: 4, overflow: 'visible' },
  // paddingRight: con "Texto en negrita" del sistema activado, Android dibuja
  // el título más ancho de lo que React Native midió para el corte de
  // numberOfLines={1} — este colchón le da aire a ese cálculo.
  tarjetaTitulo: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary, paddingRight: 10 },
  tarjetaSubtexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.hint, paddingRight: 4 },
  estadoBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Spacing.radius.full },
  estadoBadgeTexto: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  // Fila de 2 botones (eliminar / editar) — grandes y con etiqueta de texto
  // además del ícono, para que sea fácil de entender para personas muy
  // mayores sin tener que adivinar qué hace cada ícono.
  tarjetaAccionesRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
  },
  accionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    minHeight: Spacing.touch.comfortable,
  },
  accionBtnTexto: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },
  accionDivisor: { width: 1, backgroundColor: Colors.ui.border, marginVertical: Spacing.sm },

  verTodosBtn: {
    minHeight: Spacing.touch.comfortable,
    borderRadius: Spacing.radius.lg,
    borderWidth: 2,
    borderColor: Colors.agenda.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  verTodosBtnTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.agenda.accentDark },

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
