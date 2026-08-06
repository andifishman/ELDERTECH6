// ========================================
// PANTALLA: NotificacionFormPage
// DESCRIPCIÓN:
// Crear/editar una notificación: contenido, destino (con vista previa de
// cantidad de destinatarios en vivo), programación/recurrencia, vista previa
// visual y opciones avanzadas.
// ========================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Send, Clock, X, Bell, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/states';
import { useCatalogos } from '@/features/horarios/useActividades';
import { listarResidentes } from '@/services/residentesService';
import { useQuery } from '@tanstack/react-query';
import { coincideBusqueda } from '@/lib/textSearch';
import {
  useActualizarNotificacion,
  useCrearNotificacion,
  useNotificacionDetalle,
  usePreviewAudiencia,
} from './useNotificaciones';
import type { DestinoFiltro, DestinoTipo, NotificacionInput, PrioridadNotificacion, Recurrencia, TipoNotificacion } from '@/services/notificacionesService';

const TIPOS: { valor: TipoNotificacion; label: string }[] = [
  { valor: 'informacion', label: 'ℹ️ Información' },
  { valor: 'importante', label: '⚠️ Importante' },
  { valor: 'recordatorio', label: '⏰ Recordatorio' },
  { valor: 'urgente', label: '🚨 Urgente' },
  { valor: 'actividad', label: '📅 Actividad' },
  { valor: 'tutorial', label: '🎓 Tutorial' },
  { valor: 'general', label: '🔔 General' },
];

export function NotificacionFormPage() {
  const { id } = useParams();
  const esEdicion = !!id;
  const navigate = useNavigate();

  const { data: detalle, isLoading: cargandoDetalle } = useNotificacionDetalle(id);
  const { data: catalogos } = useCatalogos();
  const { data: residentes } = useQuery({ queryKey: ['residentes-notif'], queryFn: () => listarResidentes().then((rs) => rs.filter((r) => r.activo)) });
  const crear = useCrearNotificacion();
  const actualizar = useActualizarNotificacion();

  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [icono, setIcono] = useState('');
  const [tipo, setTipo] = useState<TipoNotificacion>('general');

  const [destinoTipo, setDestinoTipo] = useState<DestinoTipo>('todos');
  const [seccion, setSeccion] = useState('');
  const [habitacion, setHabitacion] = useState('');
  const [nivelDificultad, setNivelDificultad] = useState('');
  const [interesIds, setInteresIds] = useState<string[]>([]);
  const [residenteIds, setResidenteIds] = useState<string[]>([]);
  const [excluirIds, setExcluirIds] = useState<string[]>([]);
  const [incluirIds, setIncluirIds] = useState<string[]>([]);
  const [busquedaUsuarios, setBusquedaUsuarios] = useState('');

  const [programacionTipo, setProgramacionTipo] = useState<'instantanea' | 'programada'>('instantanea');
  const [programadaPara, setProgramadaPara] = useState('');
  const [recurrencia, setRecurrencia] = useState<Recurrencia>('ninguna');

  const [silenciosa, setSilenciosa] = useState(false);
  const [sonido, setSonido] = useState(true);
  const [vibracion, setVibracion] = useState(true);
  const [prioridad, setPrioridad] = useState<PrioridadNotificacion>('normal');
  const [pantallaDestino, setPantallaDestino] = useState('');

  useEffect(() => {
    if (!detalle) return;
    const n = detalle.notification;
    setTitulo(n.titulo);
    setMensaje(n.mensaje);
    setImagenUrl(n.imagen_url ?? '');
    setIcono(n.icono ?? '');
    setTipo(n.tipo);
    setDestinoTipo(n.destino_tipo);
    setSeccion(n.destino_filtro?.seccion ?? '');
    setHabitacion(n.destino_filtro?.habitacion ?? '');
    setNivelDificultad(n.destino_filtro?.nivel_dificultad ?? '');
    setInteresIds(n.destino_filtro?.interes_ids ?? []);
    setResidenteIds(n.destino_filtro?.residente_ids ?? []);
    setExcluirIds(n.excluir_residente_ids ?? []);
    setIncluirIds(n.incluir_residente_ids ?? []);
    setProgramacionTipo(n.programacion_tipo);
    setProgramadaPara(n.programada_para?.slice(0, 16) ?? '');
    setRecurrencia(n.recurrencia);
    setSilenciosa(n.silenciosa);
    setSonido(n.sonido);
    setVibracion(n.vibracion);
    setPrioridad(n.prioridad);
    setPantallaDestino(n.pantalla_destino ?? '');
  }, [detalle]);

  const habitacionesUnicas = useMemo(() => {
    const set = new Set((residentes ?? []).map((r) => r.habitacion).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [residentes]);

  const residentesFiltrados = useMemo(() => {
    const lista = residentes ?? [];
    if (!busquedaUsuarios.trim()) return lista;
    return lista.filter((r) => coincideBusqueda(`${r.nombre} ${r.apellido}`, busquedaUsuarios));
  }, [residentes, busquedaUsuarios]);

  const destinoFiltro: DestinoFiltro | null = useMemo(() => {
    if (destinoTipo === 'seccion') return seccion ? { seccion } : null;
    if (destinoTipo === 'habitacion') return habitacion ? { habitacion } : null;
    if (destinoTipo === 'nivel_dificultad') return nivelDificultad ? { nivel_dificultad: nivelDificultad } : null;
    if (destinoTipo === 'intereses') return interesIds.length ? { interes_ids: interesIds } : null;
    if (destinoTipo === 'especificos') return residenteIds.length ? { residente_ids: residenteIds } : null;
    return null;
  }, [destinoTipo, seccion, habitacion, nivelDificultad, interesIds, residenteIds]);

  // Ids que matchean el filtro de destino elegido, sin considerar los ajustes manuales
  // de incluir/excluir — se usan para saber qué aparece tildado por defecto en el picker.
  const { data: baseAudiencia } = usePreviewAudiencia(destinoTipo, destinoFiltro, null, null, true);
  const baseMatchIds = useMemo(() => new Set(baseAudiencia?.ids ?? []), [baseAudiencia]);

  const { data: preview } = usePreviewAudiencia(
    destinoTipo,
    destinoFiltro,
    excluirIds.length ? excluirIds : null,
    incluirIds.length ? incluirIds : null,
    true,
  );

  const toggleDestinatario = (id: string) => {
    if (baseMatchIds.has(id)) {
      setExcluirIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      setIncluirIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }
  };

  const seleccionarTodosDestinatarios = () => {
    setExcluirIds([]);
    setIncluirIds(residentesFiltrados.filter((r) => !baseMatchIds.has(r.id)).map((r) => r.id));
  };

  const deseleccionarTodosDestinatarios = () => {
    setExcluirIds(residentesFiltrados.filter((r) => baseMatchIds.has(r.id)).map((r) => r.id));
    setIncluirIds([]);
  };

  const construirInput = (): NotificacionInput => ({
    titulo,
    mensaje,
    imagen_url: imagenUrl || null,
    icono: icono || null,
    tipo,
    destino_tipo: destinoTipo,
    destino_filtro: destinoFiltro,
    excluir_residente_ids: excluirIds.length ? excluirIds : null,
    incluir_residente_ids: incluirIds.length ? incluirIds : null,
    programacion_tipo: programacionTipo,
    programada_para: programacionTipo === 'programada' && programadaPara ? new Date(programadaPara).toISOString() : null,
    recurrencia: programacionTipo === 'programada' ? recurrencia : 'ninguna',
    silenciosa,
    sonido,
    vibracion,
    prioridad,
    pantalla_destino: pantallaDestino || null,
  });

  const guardar = (accion: 'borrador' | 'enviar' | 'programar') => {
    if (!titulo.trim() || !mensaje.trim()) return;
    const input = construirInput();
    if (esEdicion && id) {
      actualizar.mutate({ id, input }, { onSuccess: () => navigate(`/notificaciones/${id}`) });
    } else {
      crear.mutate({ notificacion: input, accion }, { onSuccess: () => navigate('/notificaciones') });
    }
  };

  if (esEdicion && cargandoDetalle) return <LoadingState mensaje="Cargando notificación…" />;

  const guardando = crear.isPending || actualizar.isPending;
  const puedeEditarTodo = !esEdicion || detalle?.notification.estado === 'borrador' || detalle?.notification.estado === 'programada';

  return (
    <div className="space-y-5 pb-10">
      <PageHeader titulo={esEdicion ? 'Editar notificación' : 'Nueva notificación'} descripcion="Enviá un comunicado push a los residentes." />

      {/* 1. Contenido */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">1 · Contenido</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoNotificacion)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="icono">Ícono (emoji, opcional)</Label>
              <Input id="icono" value={icono} onChange={(e) => setIcono(e.target.value)} placeholder="🔔" maxLength={4} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Nueva actividad disponible" maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mensaje">Mensaje</Label>
            <Textarea id="mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3} maxLength={500} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imagen">Imagen (URL, opcional)</Label>
            <Input id="imagen" value={imagenUrl} onChange={(e) => setImagenUrl(e.target.value)} placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Destino */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">2 · Destino</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Enviar a</Label>
            <Select value={destinoTipo} onValueChange={(v) => setDestinoTipo(v as DestinoTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los usuarios</SelectItem>
                <SelectItem value="residentes">Todos los residentes</SelectItem>
                <SelectItem value="seccion">Por sección</SelectItem>
                <SelectItem value="habitacion">Por habitación</SelectItem>
                <SelectItem value="nivel_dificultad">Por nivel de dificultad</SelectItem>
                <SelectItem value="intereses">Por intereses</SelectItem>
                <SelectItem value="especificos">Usuarios específicos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {destinoTipo === 'seccion' && (
            <Select value={seccion} onValueChange={setSeccion}>
              <SelectTrigger><SelectValue placeholder="Elegí una sección" /></SelectTrigger>
              <SelectContent>
                {(catalogos?.secciones ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {destinoTipo === 'habitacion' && (
            <Select value={habitacion} onValueChange={setHabitacion}>
              <SelectTrigger><SelectValue placeholder="Elegí una habitación" /></SelectTrigger>
              <SelectContent>
                {habitacionesUnicas.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {destinoTipo === 'nivel_dificultad' && (
            <Select value={nivelDificultad} onValueChange={setNivelDificultad}>
              <SelectTrigger><SelectValue placeholder="Elegí un nivel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="independiente">Independiente</SelectItem>
                <SelectItem value="necesita_ayuda">Necesita ayuda</SelectItem>
                <SelectItem value="dependiente">Dependiente</SelectItem>
              </SelectContent>
            </Select>
          )}

          {destinoTipo === 'intereses' && (
            <div className="flex flex-wrap gap-2">
              {(catalogos?.intereses ?? []).map((i) => {
                const activo = interesIds.includes(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setInteresIds((prev) => (activo ? prev.filter((x) => x !== i.id) : [...prev, i.id]))}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${activo ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
                  >
                    {i.emoji} {i.nombre}
                  </button>
                );
              })}
            </div>
          )}

          {destinoTipo === 'especificos' && (
            <UsuariosPicker
              residentes={residentesFiltrados}
              seleccionados={residenteIds}
              onChange={setResidenteIds}
              busqueda={busquedaUsuarios}
              onBusqueda={setBusquedaUsuarios}
            />
          )}

          <div className="space-y-1.5 border-t border-border pt-3">
            <Label>Ajustar destinatarios (opcional)</Label>
            <p className="text-xs text-muted-foreground">
              Los usuarios que coinciden con el destino elegido aparecen tildados. Destildá para excluirlos, o tildá otros para sumarlos igual.
            </p>
            <DestinatariosPicker
              residentes={residentesFiltrados}
              baseMatchIds={baseMatchIds}
              excluirIds={excluirIds}
              incluirIds={incluirIds}
              onToggle={toggleDestinatario}
              onSeleccionarTodos={seleccionarTodosDestinatarios}
              onDeseleccionarTodos={deseleccionarTodosDestinatarios}
              busqueda={busquedaUsuarios}
              onBusqueda={setBusquedaUsuarios}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong className="text-foreground">{preview?.total ?? 0}</strong> destinatario{preview?.total === 1 ? '' : 's'} seleccionado{preview?.total === 1 ? '' : 's'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Programación */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">3 · Programación</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" variant={programacionTipo === 'instantanea' ? 'default' : 'outline'} onClick={() => setProgramacionTipo('instantanea')}>
              <Send className="h-4 w-4" /> Enviar ahora
            </Button>
            <Button type="button" variant={programacionTipo === 'programada' ? 'default' : 'outline'} onClick={() => setProgramacionTipo('programada')}>
              <Clock className="h-4 w-4" /> Programar
            </Button>
          </div>

          {programacionTipo === 'programada' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fecha-hora">Fecha y hora</Label>
                <Input id="fecha-hora" type="datetime-local" value={programadaPara} onChange={(e) => setProgramadaPara(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Repetir</Label>
                <Select value={recurrencia} onValueChange={(v) => setRecurrencia(v as Recurrencia)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">Una sola vez</SelectItem>
                    <SelectItem value="diaria">Todos los días</SelectItem>
                    <SelectItem value="semanal">Cada semana</SelectItem>
                    <SelectItem value="mensual">Cada mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Vista previa */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">4 · Vista previa</CardTitle></CardHeader>
        <CardContent>
          <div className="mx-auto max-w-sm rounded-xl border border-border bg-background p-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">{icono || '🔔'}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{titulo || 'Título de la notificación'}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">ahora</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{mensaje || 'El mensaje aparecerá acá.'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => navigate(esEdicion ? `/notificaciones/${id}` : '/notificaciones')}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
        {puedeEditarTodo && (
          <>
            <Button type="button" variant="outline" disabled={guardando} onClick={() => guardar('borrador')}>
              <Save className="h-4 w-4" /> {esEdicion ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>
            {!esEdicion && (
              <Button type="button" variant="outline" disabled={guardando || programacionTipo !== 'programada' || !programadaPara} onClick={() => guardar('programar')}>
                <Clock className="h-4 w-4" /> Programar
              </Button>
            )}
            <Button type="button" disabled={guardando || !titulo.trim() || !mensaje.trim()} onClick={() => guardar('enviar')}>
              <Bell className="h-4 w-4" /> {esEdicion ? 'Guardar y enviar ahora' : 'Enviar ahora'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface Residente {
  id: string;
  nombre: string;
  apellido: string;
  seccion?: string | null;
}

function DestinatariosPicker({
  residentes,
  baseMatchIds,
  excluirIds,
  incluirIds,
  onToggle,
  onSeleccionarTodos,
  onDeseleccionarTodos,
  busqueda,
  onBusqueda,
}: {
  residentes: Residente[];
  baseMatchIds: Set<string>;
  excluirIds: string[];
  incluirIds: string[];
  onToggle: (id: string) => void;
  onSeleccionarTodos: () => void;
  onDeseleccionarTodos: () => void;
  busqueda: string;
  onBusqueda: (v: string) => void;
}) {
  const estaSeleccionado = (id: string) => (baseMatchIds.has(id) ? !excluirIds.includes(id) : incluirIds.includes(id));
  const seleccionadosCount = residentes.filter((r) => estaSeleccionado(r.id)).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input value={busqueda} onChange={(e) => onBusqueda(e.target.value)} placeholder="Buscar usuario…" className="max-w-xs" />
        <Button type="button" variant="outline" size="sm" onClick={onSeleccionarTodos}>Seleccionar todos</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDeseleccionarTodos}>Deseleccionar todos</Button>
        <Badge variant="muted">{seleccionadosCount} seleccionados</Badge>
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
        {residentes.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">Sin resultados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {residentes.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <span className="truncate">
                  {r.nombre} {r.apellido}
                  {r.seccion ? <span className="text-xs text-muted-foreground"> · {r.seccion}</span> : null}
                </span>
                <input type="checkbox" checked={estaSeleccionado(r.id)} onChange={() => onToggle(r.id)} className="h-4 w-4 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UsuariosPicker({
  residentes,
  seleccionados,
  onChange,
  busqueda,
  onBusqueda,
}: {
  residentes: Residente[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  busqueda: string;
  onBusqueda: (v: string) => void;
}) {
  const toggle = (id: string) => onChange(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input value={busqueda} onChange={(e) => onBusqueda(e.target.value)} placeholder="Buscar usuario…" className="max-w-xs" />
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(residentes.map((r) => r.id))}>Seleccionar todos</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>Deseleccionar todos</Button>
        <Badge variant="muted">{seleccionados.length} seleccionados</Badge>
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
        {residentes.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">Sin resultados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {residentes.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <span className="truncate">
                  {r.nombre} {r.apellido}
                  {r.seccion ? <span className="text-xs text-muted-foreground"> · {r.seccion}</span> : null}
                </span>
                <input type="checkbox" checked={seleccionados.includes(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
