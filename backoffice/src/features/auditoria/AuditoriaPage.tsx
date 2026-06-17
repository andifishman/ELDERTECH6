// ========================================
// PANTALLA: AuditoriaPage
// DESCRIPCIÓN:
// Registro de auditoría: muestra quién hizo qué, sobre
// qué tabla y cuándo. Solo lectura. Permite rastrear
// todas las acciones administrativas del backoffice.
// ========================================
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { History } from 'lucide-react';
import { supabase, ORG_ID } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { useRealtime } from '@/hooks/useRealtime';
import type { AccionAuditoria, AuditLog } from '@/types/backoffice.types';

const ACCION_BADGE: Record<AccionAuditoria, 'success' | 'info' | 'danger' | 'warning' | 'purple'> = {
  crear: 'success',
  editar: 'info',
  eliminar: 'danger',
  pausar: 'warning',
  reactivar: 'success',
  publicar: 'purple',
};

async function listarAuditoria(): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .or(`organizacion_id.is.null,organizacion_id.eq.${ORG_ID}`)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as AuditLog[];
}

export function AuditoriaPage() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.auditoria, queryFn: listarAuditoria });
  useRealtime('audit_logs', [queryKeys.auditoria]);

  return (
    <div className="space-y-5">
      <PageHeader titulo="Auditoría" descripcion="Historial completo de acciones administrativas." />

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="p-5"><ErrorState onReintentar={() => void refetch()} /></div>
        ) : (data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState icono={History} titulo="Sin registros" descripcion="Las acciones del backoffice aparecerán acá." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acción</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tabla</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Cuándo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell><Badge variant={ACCION_BADGE[log.accion] ?? 'muted'} className="capitalize">{log.accion}</Badge></TableCell>
                  <TableCell className="text-sm text-foreground">{log.descripcion ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.tabla_afectada}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.usuario_nombre ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
