import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX, ChevronLeft, ChevronRight, MapPin, Users } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/auth/AuthContext';
import { SelectorResidente } from '@/components/Layout';
import { Aviso, Boton, Cargando, ErrorCaja, Etiqueta, Pestanas, Tarjeta, Titulo, Vacio, mensajeDeError } from '@/components/ui';
import { diaSinTildes, fechaHora, fechaLarga, hoyISO, mesActual, nombreMes, sinTildes, sumarDias, sumarMeses } from '@/lib/format';
import { cancelarInscripcion, getAgenda, getCalendario, inscribirse, type ActividadHogar, type Evento } from '@/services/familia';

type Tab = 'actividades' | 'agenda' | 'eventos';
const TABS: Tab[] = ['actividades', 'agenda', 'eventos'];

const minutos = (hora: string | null): number => {
  if (!hora) return 9999;
  const [h, m] = hora.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

function ListaActividades({ actividades }: { actividades: ActividadHogar[] }) {
  if (actividades.length === 0) return <Vacio icono={<CalendarX className="h-10 w-10" />} titulo="No hay actividades este día" />;
  return (
    <ul className="space-y-2">
      {actividades.map((a) => (
        <li key={a.id}>
          <Tarjeta className={clsx(a.suspendido && 'opacity-70')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={clsx('text-lg font-bold', a.suspendido && 'line-through')}>{a.nombre}</p>
                <p className="text-soft">{a.horario}{a.lugar ? ` · ${a.lugar}` : ''}</p>
                {a.tallerista && <p className="text-sm text-soft">Con {a.tallerista}</p>}
              </div>
              {a.suspendido && <Etiqueta color="rojo">Suspendida</Etiqueta>}
            </div>
          </Tarjeta>
        </li>
      ))}
    </ul>
  );
}

/** Selector de los próximos 7 días (el feed del Hogar es una grilla semanal). */
function SelectorDia({ dia, onCambio }: { dia: string; onCambio: (d: string) => void }) {
  const hoy = hoyISO();
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
  return (
    <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Elegí un día">
      {dias.map((d) => {
        const activo = d === dia;
        return (
          <button key={d} type="button" aria-pressed={activo} onClick={() => onCambio(d)} className={clsx('min-h-14 min-w-20 shrink-0 rounded-xl border-2 px-3 py-1.5 text-center font-semibold capitalize', activo ? 'border-primary-600 bg-primary-600 text-white' : 'border-primary-200 bg-white text-ink')}>
            <span className="block text-sm">{d === hoy ? 'Hoy' : new Date(`${d}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'UTC' })}</span>
            <span className="block text-lg">{d.slice(8)}</span>
          </button>
        );
      })}
    </div>
  );
}

function ActividadesYAgenda({ tab }: { tab: 'actividades' | 'agenda' }) {
  const { residente } = useAuth();
  const [dia, setDia] = useState(hoyISO);
  const desde = hoyISO();
  const hasta = sumarDias(desde, 30);
  const agendaQ = useQuery({ queryKey: ['agenda', residente?.id, desde], queryFn: () => getAgenda(residente!.id, desde, hasta), enabled: !!residente });

  const delDia = useMemo(
    () => (agendaQ.data?.actividades ?? []).filter((a) => sinTildes(a.dia) === diaSinTildes(dia)).sort((a, b) => minutos(a.hora) - minutos(b.hora)),
    [agendaQ.data, dia],
  );

  const recordatoriosPorDia = useMemo(() => {
    const mapa = new Map<string, NonNullable<typeof agendaQ.data>['recordatorios']>();
    for (const r of agendaQ.data?.recordatorios ?? []) mapa.set(r.fecha, [...(mapa.get(r.fecha) ?? []), r]);
    return [...mapa.entries()];
  }, [agendaQ.data]);

  if (!residente) return <Vacio icono={<Users className="h-10 w-10" />} titulo="No tenés un residente vinculado" texto="Consultale a la residencia." />;
  if (agendaQ.isLoading) return <Cargando />;
  if (agendaQ.isError || !agendaQ.data) return <ErrorCaja error={agendaQ.error} onReintentar={() => void agendaQ.refetch()} />;

  if (tab === 'actividades') {
    return (
      <>
        <p className="mb-3 text-soft">Actividades del piso de {residente.nombre}{residente.seccion ? ` (${residente.seccion})` : ''}.</p>
        {!agendaQ.data.actividadesDisponibles && <div className="mb-3"><Aviso tipo="error">No pudimos traer las actividades de la residencia en este momento. Probá de nuevo en un rato.</Aviso></div>}
        <SelectorDia dia={dia} onCambio={setDia} />
        <h2 className="mb-2 text-lg font-bold capitalize text-primary-800">{fechaLarga(`${dia}T12:00:00Z`)}</h2>
        <ListaActividades actividades={delDia} />
      </>
    );
  }

  return (
    <>
      <p className="mb-3 text-soft">Lo que {residente.nombre} anotó en su agenda, para los próximos 30 días. Es solo para mirar.</p>
      {recordatoriosPorDia.length === 0 ? (
        <Vacio icono={<CalendarX className="h-10 w-10" />} titulo={`${residente.nombre} no tiene nada anotado`} texto="Cuando anote algo en su agenda, lo vas a ver acá." />
      ) : (
        <div className="space-y-4">
          {recordatoriosPorDia.map(([fecha, items]) => (
            <section key={fecha} aria-label={fechaLarga(`${fecha}T12:00:00Z`)}>
              <h2 className="mb-1 text-lg font-bold capitalize text-primary-800">{fecha === desde ? 'Hoy' : fechaLarga(`${fecha}T12:00:00Z`)}</h2>
              <ul className="space-y-2">
                {items.map((r) => (
                  <li key={r.id}>
                    <Tarjeta className="flex items-center gap-3">
                      <span className="rounded-lg bg-primary-100 px-3 py-1 text-lg font-bold text-primary-800">{r.hora.slice(0, 5)}</span>
                      <span className={clsx('min-w-0 flex-1 break-words font-semibold', r.estado === 'realizado' && 'line-through opacity-70')}>{r.titulo}</span>
                      {r.estado === 'realizado' && <Etiqueta color="verde">Hecho</Etiqueta>}
                    </Tarjeta>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function TarjetaEvento({ evento }: { evento: Evento }) {
  const qc = useQueryClient();
  const [personas, setPersonas] = useState(evento.mi_inscripcion?.personas ?? 1);
  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['calendario'] });
    void qc.invalidateQueries({ queryKey: ['inicio'] });
  };
  const anotar = useMutation({ mutationFn: () => inscribirse(evento.id, personas), onSuccess: refrescar });
  const bajar = useMutation({ mutationFn: () => cancelarInscripcion(evento.id), onSuccess: refrescar });
  const pasado = new Date(evento.termina_en ?? evento.inicia_en).getTime() < Date.now();
  const lugares = evento.cupo ? Math.max(0, evento.cupo - evento.personas_inscriptas + (evento.mi_inscripcion?.personas ?? 0)) : null;
  const error = anotar.error ?? bajar.error;

  return (
    <Tarjeta className={clsx(pasado && 'opacity-70')}>
      <h3 className="text-lg font-bold">{evento.titulo}</h3>
      <p className="font-semibold text-primary-800">{fechaHora(evento.inicia_en)}</p>
      {evento.lugar && <p className="flex items-center gap-1 text-soft"><MapPin className="h-4 w-4" aria-hidden /> {evento.lugar}</p>}
      {evento.descripcion && <p className="mt-2 whitespace-pre-line break-words">{evento.descripcion}</p>}

      {evento.abierto_inscripcion && !pasado && (
        <div className="mt-3 space-y-3 border-t border-primary-100 pt-3">
          {evento.mi_inscripcion && <Etiqueta color="verde">Estás anotado/a · {evento.mi_inscripcion.personas} {evento.mi_inscripcion.personas === 1 ? 'persona' : 'personas'}</Etiqueta>}
          {lugares !== null && <p className="text-sm text-soft">{lugares === 0 ? 'No quedan lugares.' : `Quedan ${lugares} ${lugares === 1 ? 'lugar' : 'lugares'}.`}</p>}
          <div className="flex items-center gap-3">
            <label htmlFor={`pers-${evento.id}`} className="font-semibold">¿Cuántas personas van?</label>
            <select id={`pers-${evento.id}`} value={personas} onChange={(e) => setPersonas(Number(e.target.value))} className="min-h-12 rounded-xl border-2 border-primary-200 bg-white px-3 text-base font-semibold">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {error && <Aviso tipo="error">{mensajeDeError(error)}</Aviso>}
          <div className="flex flex-wrap gap-2">
            <Boton cargando={anotar.isPending} disabled={bajar.isPending || (lugares === 0 && !evento.mi_inscripcion)} onClick={() => anotar.mutate()}>{evento.mi_inscripcion ? 'Guardar cambio' : 'Anotarme'}</Boton>
            {evento.mi_inscripcion && <Boton variante="secundario" cargando={bajar.isPending} disabled={anotar.isPending} onClick={() => bajar.mutate()}>Ya no voy</Boton>}
          </div>
        </div>
      )}
      {pasado && <p className="mt-2 text-sm text-soft">Este evento ya pasó.</p>}
    </Tarjeta>
  );
}

function Eventos() {
  const [mes, setMes] = useState(mesActual);
  const q = useQuery({ queryKey: ['calendario', mes], queryFn: () => getCalendario(mes) });
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Boton variante="secundario" aria-label="Mes anterior" onClick={() => setMes(sumarMeses(mes, -1))}><ChevronLeft className="h-5 w-5" aria-hidden /></Boton>
        <h2 className="text-lg font-bold capitalize text-primary-800" aria-live="polite">{nombreMes(mes)}</h2>
        <Boton variante="secundario" aria-label="Mes siguiente" onClick={() => setMes(sumarMeses(mes, 1))}><ChevronRight className="h-5 w-5" aria-hidden /></Boton>
      </div>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data && (q.data.eventos.length === 0 ? <Vacio icono={<CalendarX className="h-10 w-10" />} titulo="No hay eventos este mes" /> : <ul className="space-y-3">{q.data.eventos.map((e) => <li key={e.id}><TarjetaEvento evento={e} /></li>)}</ul>)}
    </>
  );
}

export function CalendarioPage() {
  const { residente } = useAuth();
  const [params, setParams] = useSearchParams();
  const pedida = params.get('tab') as Tab | null;
  const tab: Tab = pedida && TABS.includes(pedida) ? pedida : 'actividades';
  const nombre = residente?.nombre ?? 'el residente';

  return (
    <div>
      <Titulo>Calendario</Titulo>
      <SelectorResidente />
      <Pestanas<Tab> valor={tab} onCambio={(v) => setParams({ tab: v }, { replace: true })} opciones={[{ id: 'actividades', texto: 'Actividades' }, { id: 'agenda', texto: `Agenda de ${nombre}` }, { id: 'eventos', texto: 'Eventos' }]} />
      {tab === 'eventos' ? <Eventos /> : <ActividadesYAgenda tab={tab} />}
    </div>
  );
}
