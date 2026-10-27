// ========================================
// PANTALLA: HorariosHogarPage
// DESCRIPCIÓN:
// Muestra las actividades del Hogar tal como las ve la app. Los datos vienen
// del sistema del hogar (solo lectura) y se refrescan solos cada 5 minutos.
// ========================================
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { notify } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { usePermisos } from '@/hooks/usePermisos';
import { actualizarHorariosHogar, obtenerHorariosHogar, type HorariosHogar } from '@/services/horariosHogarService';

const CINCO_MINUTOS = 5 * 60 * 1000;
const KEY = ['horarios-hogar'] as const;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_LUN_A_DOM = [...DIAS.slice(1), DIAS[0]];

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function HorariosHogarPage() {
  const permisos = usePermisos('horarios');
  const qc = useQueryClient();
  const [dia, setDia] = useState(() => DIAS[new Date().getDay()]);

  // Pregunta al backend cada 5 min (el backend, a su vez, solo consulta al hogar si su caché venció).
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: KEY,
    queryFn: obtenerHorariosHogar,
    refetchInterval: CINCO_MINUTOS,
    staleTime: CINCO_MINUTOS,
  });

  const actualizar = useMutation({
    mutationFn: actualizarHorariosHogar,
    onSuccess: (nuevo: HorariosHogar) => {
      qc.setQueryData(KEY, nuevo);
      notify.success('Horarios actualizados', 'Ya se ven así en la app de los residentes.');
    },
    onError: () => notify.error('No se pudo actualizar'),
  });

  const delDia = useMemo(
    () =>
      (data?.actividades ?? [])
        .filter((a) => sinTildes(a.dia) === sinTildes(dia))
        .sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99')),
    [data, dia],
  );

  const cantidadPorDia = (d: string) => (data?.actividades ?? []).filter((a) => sinTildes(a.dia) === sinTildes(d)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Horarios del Hogar"
        descripcion="Actividades y talleres que publica el sistema del hogar. Solo lectura: se editan allá."
        acciones={
          permisos.puedeEditar && (
            <Button variant="outline" onClick={() => actualizar.mutate()} disabled={actualizar.isPending}>
              <RefreshCw className={cn('h-4 w-4', actualizar.isPending && 'animate-spin')} /> Actualizar ahora
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        {DIAS_LUN_A_DOM.map((d) => (
          <button
            key={d}
            onClick={() => setDia(d)}
            className={cn(
              'rounded-xl border px-4 py-2 font-semibold transition-colors',
              d === dia ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent',
            )}
          >
            {d} <span className="text-xs opacity-70">({cantidadPorDia(d)})</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <h3 className="font-semibold text-foreground">
            {dia} · {delDia.length} actividades
          </h3>
          {data && (
            <span className="text-xs text-muted-foreground">
              Última lectura del hogar: {format(new Date(data.actualizadoEn), "d MMM, HH:mm 'hs'", { locale: es })} · se actualiza sola cada 5 min
            </span>
          )}
        </div>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="p-5">
            <ErrorState mensaje={error instanceof Error ? error.message : 'No se pudo leer el sistema de horarios del hogar.'} onReintentar={() => void refetch()} />
          </div>
        ) : delDia.length === 0 ? (
          <div className="p-5">
            <EmptyState icono={CalendarClock} titulo="No hay actividades este día" descripcion="El sistema del hogar no tiene actividades cargadas para este día." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Lugar</TableHead>
                  <TableHead>Tallerista</TableHead>
                  <TableHead>Sectores</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delDia.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <span className="inline-flex rounded-md bg-primary-50 px-2 py-1 text-sm font-bold text-primary-700">{a.horario}</span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{a.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.lugar ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.tallerista ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.sectores.length ? a.sectores.join(', ') : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={a.suspendido ? 'muted' : 'success'}>{a.suspendido ? 'Suspendida' : 'Activa'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
