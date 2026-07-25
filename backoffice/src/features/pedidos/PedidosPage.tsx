// ========================================
// PANTALLA: PedidosPage
// DESCRIPCIÓN:
// Listado de solicitudes enviadas por los residentes
// (pedidos, comentarios, sugerencias, actividades
// propuestas, recomendaciones de película). Filtros por
// estado/tipo/sección/fecha, búsqueda de texto libre,
// ordenamiento y sincronización en tiempo real.
// ========================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Inbox, Mic, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { useRealtime } from '@/hooks/useRealtime';
import { usePedidosLista } from './usePedidos';
import { SECCIONES } from '@/types/database.types';
import type { EstadoPedido, TipoPedido } from '@/services/pedidosService';

const TIPOS_INFO: Record<TipoPedido, { label: string; emoji: string }> = {
  pedido: { label: 'Pedido', emoji: '📋' },
  comentario: { label: 'Comentario', emoji: '💬' },
  sugerencia: { label: 'Sugerencia', emoji: '💡' },
  actividad_propuesta: { label: 'Actividad propuesta', emoji: '🎉' },
  recomendacion_pelicula: { label: 'Recomendación de película', emoji: '🎬' },
};

const ESTADO_BADGE: Record<EstadoPedido, 'warning' | 'info' | 'success'> = {
  pendiente: 'warning',
  en_proceso: 'info',
  resuelta: 'success',
};

const ESTADO_LABEL: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
};

type RangoFecha = 'todos' | 'hoy' | 'semana' | 'mes' | 'personalizado';

function rangoAFechas(rango: RangoFecha, desdePersonalizado: string, hastaPersonalizado: string): { fechaDesde?: string; fechaHasta?: string } {
  if (rango === 'personalizado') {
    return {
      fechaDesde: desdePersonalizado ? new Date(`${desdePersonalizado}T00:00:00`).toISOString() : undefined,
      fechaHasta: hastaPersonalizado ? new Date(`${hastaPersonalizado}T23:59:59`).toISOString() : undefined,
    };
  }
  if (rango === 'todos') return {};
  const ahora = new Date();
  const desde = new Date(ahora);
  if (rango === 'hoy') desde.setHours(0, 0, 0, 0);
  if (rango === 'semana') desde.setDate(desde.getDate() - 7);
  if (rango === 'mes') desde.setMonth(desde.getMonth() - 1);
  return { fechaDesde: desde.toISOString() };
}

export function PedidosPage() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoPedido | 'todos'>('todos');
  const [tipo, setTipo] = useState<TipoPedido | 'todos'>('todos');
  const [seccion, setSeccion] = useState<string>('todas');
  const [rango, setRango] = useState<RangoFecha>('todos');
  const [desdePersonalizado, setDesdePersonalizado] = useState('');
  const [hastaPersonalizado, setHastaPersonalizado] = useState('');
  const [ordenar, setOrdenar] = useState<'recientes' | 'antiguos' | 'usuario_asc' | 'usuario_desc'>('recientes');

  const filtros = useMemo(
    () => ({
      estado,
      tipo,
      seccion: seccion === 'todas' ? undefined : seccion,
      busqueda: busqueda || undefined,
      ordenar,
      ...rangoAFechas(rango, desdePersonalizado, hastaPersonalizado),
    }),
    [estado, tipo, seccion, busqueda, ordenar, rango, desdePersonalizado, hastaPersonalizado],
  );

  const { data, isLoading, isError, refetch } = usePedidosLista(filtros);
  useRealtime('pedidos_sugerencias', [['pedidos']]);

  const toggleOrdenUsuario = () => setOrdenar((o) => (o === 'usuario_asc' ? 'usuario_desc' : 'usuario_asc'));
  const toggleOrdenFecha = () => setOrdenar((o) => (o === 'recientes' ? 'antiguos' : 'recientes'));

  const hayFiltros = busqueda || estado !== 'todos' || tipo !== 'todos' || seccion !== 'todas' || rango !== 'todos';
  const limpiarFiltros = () => {
    setBusqueda('');
    setEstado('todos');
    setTipo('todos');
    setSeccion('todas');
    setRango('todos');
    setDesdePersonalizado('');
    setHastaPersonalizado('');
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Pedidos y Sugerencias" descripcion="Solicitudes enviadas por los residentes desde la app." />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por usuario, habitación, título o transcripción…"
            className="pl-9"
          />
        </div>

        <Select value={estado} onValueChange={(v) => setEstado(v as EstadoPedido | 'todos')}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="resuelta">Resueltos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoPedido | 'todos')}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {(Object.entries(TIPOS_INFO) as [TipoPedido, { label: string; emoji: string }][]).map(([id, info]) => (
              <SelectItem key={id} value={id}>{info.emoji} {info.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={seccion} onValueChange={setSeccion}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue placeholder="Sección" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las secciones</SelectItem>
            {SECCIONES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={rango} onValueChange={(v) => setRango(v as RangoFecha)}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue placeholder="Fecha" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las fechas</SelectItem>
            <SelectItem value="hoy">Hoy</SelectItem>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mes</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {rango === 'personalizado' && (
          <>
            <Input type="date" value={desdePersonalizado} onChange={(e) => setDesdePersonalizado(e.target.value)} className="w-auto" />
            <span className="text-sm text-muted-foreground">a</span>
            <Input type="date" value={hastaPersonalizado} onChange={(e) => setHastaPersonalizado(e.target.value)} className="w-auto" />
          </>
        )}

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>Limpiar filtros</Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="p-5"><ErrorState onReintentar={() => void refetch()} /></div>
        ) : !data || data.length === 0 ? (
          <div className="p-5">
            <EmptyState icono={Inbox} titulo="Sin solicitudes" descripcion="Todavía no llegaron pedidos ni sugerencias." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <button type="button" onClick={toggleOrdenUsuario} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
                      Usuario
                      {ordenar === 'usuario_asc' ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : ordenar === 'usuario_desc' ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </TableHead>
                  <TableHead>Habitación / Sección</TableHead>
                  <TableHead>
                    <button type="button" onClick={toggleOrdenFecha} className="flex items-center gap-1 hover:text-foreground transition-colors font-medium">
                      Fecha
                      {ordenar === 'recientes' ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : ordenar === 'antiguos' ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Resumen</TableHead>
                  <TableHead className="text-center">Audio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => {
                  const info = TIPOS_INFO[p.tipo];
                  return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/pedidos/${p.id}`)}>
                      <TableCell><span className="whitespace-nowrap">{info.emoji} {info.label}</span></TableCell>
                      <TableCell><Badge variant={ESTADO_BADGE[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge></TableCell>
                      <TableCell className="font-medium text-foreground">
                        {p.residente ? `${p.residente.nombre} ${p.residente.apellido}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.residente?.habitacion ?? '—'} {p.residente?.seccion ? `· ${p.residente.seccion}` : ''}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.titulo}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                        {p.descripcion || p.transcripcion || '—'}
                      </TableCell>
                      <TableCell className="text-center">{p.audio_url && <Mic className="inline h-4 w-4 text-primary" />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
