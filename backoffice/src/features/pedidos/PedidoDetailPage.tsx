// ========================================
// PANTALLA: PedidoDetailPage
// DESCRIPCIÓN:
// Vista detallada de una solicitud: datos del residente,
// mensaje completo, reproductor de audio + transcripción,
// y acciones de gestión (cambiar estado, eliminar,
// reintentar transcripción).
// ========================================
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Copy, RefreshCw, Trash2, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingState, ErrorState } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { notify } from '@/components/ui/toast';
import { iniciales } from '@/lib/utils';
import {
  usePedidoDetalle,
  useActualizarEstadoPedido,
  useEliminarPedido,
  useReintentarTranscripcion,
} from './usePedidos';
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

export function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pedido, isLoading, isError, refetch } = usePedidoDetalle(id);
  const actualizarEstado = useActualizarEstadoPedido();
  const eliminar = useEliminarPedido();
  const reintentar = useReintentarTranscripcion();
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  if (isLoading) return <LoadingState mensaje="Cargando solicitud…" />;
  if (isError || !pedido) return <ErrorState onReintentar={() => void refetch()} />;

  const info = TIPOS_INFO[pedido.tipo];

  const copiarTranscripcion = () => {
    if (!pedido.transcripcion) return;
    void navigator.clipboard.writeText(pedido.transcripcion);
    notify.success('Transcripción copiada');
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/pedidos')}>
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Button>

      {/* ── Usuario ── */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">
              {pedido.residente ? iniciales(`${pedido.residente.nombre} ${pedido.residente.apellido}`) : '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {pedido.residente ? `${pedido.residente.nombre} ${pedido.residente.apellido}` : 'Residente desconocido'}
            </p>
            <p className="text-sm text-muted-foreground">
              {pedido.residente?.habitacion ? `Habitación ${pedido.residente.habitacion}` : 'Sin habitación'}
              {pedido.residente?.seccion ? ` · Sección ${pedido.residente.seccion}` : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Mensaje ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-xl">{info.emoji}</span> {info.label}
          </CardTitle>
          <Badge variant={ESTADO_BADGE[pedido.estado]}>{ESTADO_LABEL[pedido.estado]}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {format(new Date(pedido.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </p>

          <div>
            <p className="text-sm font-semibold text-foreground">{pedido.titulo}</p>
            {pedido.descripcion && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{pedido.descripcion}</p>
            )}
          </div>

          {pedido.audio_url && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <audio controls src={pedido.audio_url} className="w-full" />

              {pedido.transcripcion_estado === 'completada' && pedido.transcripcion ? (
                <div className="rounded-md border border-dashed border-border bg-background p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transcripción del audio</span>
                    <button type="button" onClick={copiarTranscripcion} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Copy className="h-3 w-3" /> Copiar
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm italic text-muted-foreground">"{pedido.transcripcion}"</p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-background p-3">
                  <span className="text-xs text-muted-foreground">
                    {pedido.transcripcion_estado === 'fallida' ? 'No se pudo transcribir este audio.' : 'Transcripción no disponible.'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => reintentar.mutate(pedido.id)} disabled={reintentar.isPending}>
                    {reintentar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Reintentar transcripción
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Acciones ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Acciones</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {pedido.estado !== 'en_proceso' && (
            <Button variant="outline" onClick={() => actualizarEstado.mutate({ id: pedido.id, estado: 'en_proceso' })} disabled={actualizarEstado.isPending}>
              En proceso
            </Button>
          )}
          {pedido.estado !== 'resuelta' && (
            <Button onClick={() => actualizarEstado.mutate({ id: pedido.id, estado: 'resuelta' })} disabled={actualizarEstado.isPending}>
              <CheckCircle2 className="h-4 w-4" /> Marcar como resuelta
            </Button>
          )}
          {pedido.estado !== 'pendiente' && (
            <Button variant="outline" onClick={() => actualizarEstado.mutate({ id: pedido.id, estado: 'pendiente' })} disabled={actualizarEstado.isPending}>
              <RotateCcw className="h-4 w-4" /> Volver a pendiente
            </Button>
          )}
          <Button variant="destructive" className="ml-auto" onClick={() => setConfirmarEliminar(true)}>
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        abierto={confirmarEliminar}
        onOpenChange={setConfirmarEliminar}
        titulo="¿Eliminar esta solicitud?"
        descripcion="Esta acción no se puede deshacer."
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => eliminar.mutate(pedido.id, { onSuccess: () => navigate('/pedidos') })}
      />
    </div>
  );
}
