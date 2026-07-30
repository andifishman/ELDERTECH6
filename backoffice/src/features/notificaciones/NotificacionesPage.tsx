// ========================================
// PANTALLA: NotificacionesPage
// DESCRIPCIÓN:
// Listado de notificaciones push enviadas/programadas/en borrador, con
// filtros, búsqueda, paginación y acciones rápidas por fila.
// ========================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Bell, Plus, Copy, Trash2, Send, Ban, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  useCancelarProgramacion,
  useDuplicarNotificacion,
  useEliminarNotificacion,
  useEnviarAhora,
  useNotificacionesLista,
  useReenviarNotificacion,
} from './useNotificaciones';
import type { EstadoNotificacion } from '@/services/notificacionesService';

const ESTADO_BADGE: Record<EstadoNotificacion, 'muted' | 'warning' | 'info' | 'success' | 'danger'> = {
  borrador: 'muted',
  programada: 'info',
  enviando: 'info',
  enviada: 'success',
  fallida: 'danger',
  cancelada: 'muted',
};

const ESTADO_LABEL: Record<EstadoNotificacion, string> = {
  borrador: 'Borrador',
  programada: 'Programada',
  enviando: 'Enviando…',
  enviada: 'Enviada',
  fallida: 'Fallida',
  cancelada: 'Cancelada',
};

const TIPO_LABEL: Record<string, string> = {
  informacion: 'ℹ️ Información',
  importante: '⚠️ Importante',
  recordatorio: '⏰ Recordatorio',
  urgente: '🚨 Urgente',
  actividad: '📅 Actividad',
  tutorial: '🎓 Tutorial',
  general: '🔔 General',
};

const POR_PAGINA = 15;

export function NotificacionesPage() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoNotificacion | 'todas'>('todas');
  const [orden, setOrden] = useState<'recientes' | 'antiguas'>('recientes');
  const [pagina, setPagina] = useState(1);
  const [aEliminar, setAEliminar] = useState<string | null>(null);

  const filtros = useMemo(
    () => ({ estado: estado === 'todas' ? undefined : estado, busqueda: busqueda || undefined, orden, pagina, porPagina: POR_PAGINA }),
    [estado, busqueda, orden, pagina],
  );

  const { data, isLoading, isError, refetch } = useNotificacionesLista(filtros);
  const enviarAhora = useEnviarAhora();
  const cancelar = useCancelarProgramacion();
  const reenviar = useReenviarNotificacion();
  const duplicar = useDuplicarNotificacion();
  const eliminar = useEliminarNotificacion();

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / POR_PAGINA)) : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Notificaciones"
        descripcion="Enviá comunicados push a los residentes."
        acciones={
          <Button onClick={() => navigate('/notificaciones/nueva')}>
            <Plus className="h-4 w-4" /> Nueva notificación
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} placeholder="Buscar por título o mensaje…" className="pl-9" />
        </div>

        <Select value={estado} onValueChange={(v) => { setEstado(v as EstadoNotificacion | 'todas'); setPagina(1); }}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="borrador">Borradores</SelectItem>
            <SelectItem value="programada">Programadas</SelectItem>
            <SelectItem value="enviada">Enviadas</SelectItem>
            <SelectItem value="fallida">Fallidas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={orden} onValueChange={(v) => setOrden(v as 'recientes' | 'antiguas')}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recientes">Más nuevas</SelectItem>
            <SelectItem value="antiguas">Más viejas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="p-5"><ErrorState onReintentar={() => void refetch()} /></div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-5">
            <EmptyState icono={Bell} titulo="Sin notificaciones" descripcion="Todavía no se creó ninguna notificación." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Destinatarios</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((n) => (
                    <TableRow key={n.id} className="cursor-pointer" onClick={() => navigate(`/notificaciones/${n.id}`)}>
                      <TableCell className="font-medium text-foreground max-w-[280px] truncate">{n.titulo}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{TIPO_LABEL[n.tipo] ?? n.tipo}</TableCell>
                      <TableCell><Badge variant={ESTADO_BADGE[n.estado]}>{ESTADO_LABEL[n.estado]}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{n.destinatarios_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.programada_para ?? n.enviada_en ?? n.created_at), { addSuffix: true, locale: es })}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {(n.estado === 'borrador' || n.estado === 'programada') && (
                            <Button variant="ghost" size="sm" title="Enviar ahora" onClick={() => enviarAhora.mutate(n.id)}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {n.estado === 'programada' && (
                            <Button variant="ghost" size="sm" title="Cancelar programación" onClick={() => cancelar.mutate(n.id)}>
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          {(n.estado === 'enviada' || n.estado === 'fallida') && (
                            <Button variant="ghost" size="sm" title="Reenviar" onClick={() => reenviar.mutate(n.id)}>
                              <RotateCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" title="Duplicar" onClick={() => duplicar.mutate(n.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Eliminar" onClick={() => setAEliminar(n.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Página {pagina} de {totalPaginas} · {data.total} notificaciones
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => !v && setAEliminar(null)}
        titulo="¿Eliminar esta notificación?"
        descripcion="Esta acción no se puede deshacer."
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => aEliminar && eliminar.mutate(aEliminar, { onSuccess: () => setAEliminar(null) })}
      />
    </div>
  );
}
