// ========================================
// PANTALLA: NotificacionDetailPage
// DESCRIPCIÓN:
// Detalle de una notificación: estadísticas de alcance/entrega/apertura,
// listado de destinatarios con su estado individual, historial de acciones
// (logs) y botones de gestión.
// ========================================
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Pencil, Trash2, Send, Ban, RotateCw, Copy, CheckCircle2, XCircle, Clock, Users, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  useCancelarProgramacion,
  useDestinatarios,
  useDuplicarNotificacion,
  useEliminarNotificacion,
  useEnviarAhora,
  useNotificacionDetalle,
  useNotificacionLogs,
  useReenviarNotificacion,
} from './useNotificaciones';
import type { EstadoDestinatario, EstadoNotificacion } from '@/services/notificacionesService';

const ESTADO_BADGE: Record<EstadoNotificacion, 'muted' | 'warning' | 'info' | 'success' | 'danger'> = {
  borrador: 'muted', programada: 'info', enviando: 'info', enviada: 'success', fallida: 'danger', cancelada: 'muted',
};
const ESTADO_LABEL: Record<EstadoNotificacion, string> = {
  borrador: 'Borrador', programada: 'Programada', enviando: 'Enviando…', enviada: 'Enviada', fallida: 'Fallida', cancelada: 'Cancelada',
};
const DEST_ESTADO_BADGE: Record<EstadoDestinatario, 'muted' | 'info' | 'success' | 'danger'> = {
  pendiente: 'muted', enviado: 'info', entregado: 'success', abierto: 'success', fallido: 'danger',
};

const STAT_ITEMS: { key: keyof import('@/services/notificacionesService').RecipientStats; label: string; icon: typeof Users }[] = [
  { key: 'alcanzados', label: 'Alcanzados', icon: Users },
  { key: 'entregados', label: 'Entregados', icon: CheckCircle2 },
  { key: 'abiertos', label: 'Abiertos', icon: Eye },
  { key: 'fallidos', label: 'Fallidos', icon: XCircle },
  { key: 'pendientes', label: 'Pendientes', icon: Clock },
];

export function NotificacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useNotificacionDetalle(id);
  const { data: destinatarios } = useDestinatarios(id);
  const { data: logs } = useNotificacionLogs(id);
  const enviarAhora = useEnviarAhora();
  const cancelar = useCancelarProgramacion();
  const reenviar = useReenviarNotificacion();
  const duplicar = useDuplicarNotificacion();
  const eliminar = useEliminarNotificacion();
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  if (isLoading) return <LoadingState mensaje="Cargando notificación…" />;
  if (isError || !data) return <ErrorState onReintentar={() => void refetch()} />;

  const { notification: n, stats } = data;

  return (
    <div className="space-y-5 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/notificaciones')}>
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">{n.icono ?? '🔔'} {n.titulo}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{n.mensaje}</p>
          </div>
          <Badge variant={ESTADO_BADGE[n.estado]}>{ESTADO_LABEL[n.estado]}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {n.enviada_en
              ? `Enviada el ${format(new Date(n.enviada_en), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`
              : n.programada_para
                ? `Programada para ${format(new Date(n.programada_para), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`
                : `Creada el ${format(new Date(n.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border border-border p-3 text-center">
                <Icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{stats[key]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {(n.estado === 'borrador' || n.estado === 'programada') && (
              <Button size="sm" onClick={() => enviarAhora.mutate(n.id)} disabled={enviarAhora.isPending}>
                <Send className="h-4 w-4" /> Enviar ahora
              </Button>
            )}
            {n.estado === 'borrador' && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/notificaciones/${n.id}/editar`)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            )}
            {n.estado === 'programada' && (
              <Button size="sm" variant="outline" onClick={() => cancelar.mutate(n.id)} disabled={cancelar.isPending}>
                <Ban className="h-4 w-4" /> Cancelar programación
              </Button>
            )}
            {(n.estado === 'enviada' || n.estado === 'fallida') && (
              <Button size="sm" variant="outline" onClick={() => reenviar.mutate(n.id)} disabled={reenviar.isPending}>
                <RotateCw className="h-4 w-4" /> Reenviar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => duplicar.mutate(n.id)} disabled={duplicar.isPending}>
              <Copy className="h-4 w-4" /> Duplicar
            </Button>
            <Button size="sm" variant="destructive" className="ml-auto" onClick={() => setConfirmarEliminar(true)}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>

      {destinatarios && destinatarios.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Destinatarios</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead>Entregado</TableHead>
                    <TableHead>Abierto</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinatarios.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">{d.residente ? `${d.residente.nombre} ${d.residente.apellido}` : '—'}</TableCell>
                      <TableCell><Badge variant={DEST_ESTADO_BADGE[d.estado]}>{d.estado}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.enviado_en ? format(new Date(d.enviado_en), 'HH:mm:ss') : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.entregado_en ? format(new Date(d.entregado_en), 'HH:mm:ss') : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.abierto_en ? format(new Date(d.abierto_en), 'HH:mm:ss') : '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-destructive">{d.error_mensaje ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {logs && logs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground">
                    <Badge variant="outline" className="mr-2 capitalize">{log.accion}</Badge>
                    {log.descripcion}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{format(new Date(log.created_at), 'dd/MM HH:mm')}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        abierto={confirmarEliminar}
        onOpenChange={setConfirmarEliminar}
        titulo="¿Eliminar esta notificación?"
        descripcion="Esta acción no se puede deshacer."
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => eliminar.mutate(n.id, { onSuccess: () => navigate('/notificaciones') })}
      />
    </div>
  );
}
