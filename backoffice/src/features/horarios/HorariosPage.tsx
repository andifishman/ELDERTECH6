// ========================================
// PANTALLA: HorariosPage
// DESCRIPCIÓN:
// Gestión de horarios y actividades. Lista las
// actividades por fecha en una tabla profesional con
// estado, recurrencia y acciones (editar, pausar/
// reactivar, eliminar). Sincronizada en tiempo real.
// ========================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Pause, Play, CalendarClock } from 'lucide-react';
import { addDays, format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { cn, formatHora } from '@/lib/utils';
import { useRealtime } from '@/hooks/useRealtime';
import { usePermisos } from '@/hooks/usePermisos';
import { useActividades, useEliminarActividad, useToggleActividad } from './useActividades';
import type { ActividadCompleta } from '@/types/database.types';

// etiqueta de recurrencia legible a partir del patrón
function etiquetaRecurrencia(a: ActividadCompleta): string {
  if (!a.es_recurrente || !a.patron_recurrencia?.dias_semana) return 'Única';
  const d = a.patron_recurrencia.dias_semana;
  if (d.length === 7) return 'Todos los días';
  if (d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) return 'Lun a Vie';
  if (d.length === 2 && d.includes(0) && d.includes(6)) return 'Fines de semana';
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return d.map((x) => nombres[x]).join(' / ');
}

export function HorariosPage() {
  const navigate = useNavigate();
  const permisos = usePermisos();
  const [fecha, setFecha] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [aEliminar, setAEliminar] = useState<ActividadCompleta | null>(null);

  const { data, isLoading, isError, refetch } = useActividades(fecha);
  const toggle = useToggleActividad();
  const eliminar = useEliminarActividad();

  useRealtime('actividades', [['actividades']]);

  // 30 días atrás + hoy + 30 días adelante
  const hoy = useMemo(() => new Date(), []);
  const dias = useMemo(
    () => Array.from({ length: 61 }, (_, i) => addDays(hoy, -30 + i)),
    [hoy],
  );

  // auto-scroll: hoy queda como el 3er chip visible al montar
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!scrollRef.current || !todayRef.current) return;
    // Hoy está en el índice 30 del array de 61 días (−30…hoy…+30)
    // Para que sea el 3er chip visible hay que saltear 28 chips (índices 0–27)
    const chip = todayRef.current.offsetWidth + 8; // ancho botón + gap-2
    scrollRef.current.scrollLeft = chip * 28;
  }, []);

  const tituloFecha = format(new Date(fecha + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Gestión de Horarios"
        descripcion="Crear, editar y gestionar todas las actividades del geriátrico."
        acciones={
          permisos.puedeCrear && (
            <Button asChild>
              <Link to="/horarios/nueva">
                <Plus className="h-4 w-4" /> Agregar
              </Link>
            </Button>
          )
        }
      />

      {/* selector de día */}
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {dias.map((d) => {
            const valor = format(d, 'yyyy-MM-dd');
            const activo = valor === fecha;
            const esHoy = isToday(d);
            return (
              <button
                key={valor}
                ref={esHoy ? todayRef : undefined}
                onClick={() => setFecha(valor)}
                className={cn(
                  'flex flex-col items-center rounded-xl border px-5 py-3 font-semibold transition-colors',
                  activo
                    ? 'border-primary bg-primary text-primary-foreground'
                    : esHoy
                    ? 'border-2 border-primary text-primary-700 bg-card hover:bg-primary-50'
                    : 'border-border bg-card text-foreground hover:bg-accent',
                )}
              >
                <span className="text-xs uppercase tracking-wide capitalize">{format(d, 'EEE', { locale: es })}</span>
                <span className="text-xl leading-tight">{format(d, 'd')}</span>
                {esHoy && !activo
                  ? <span className="text-xs font-bold text-primary">● hoy</span>
                  : <span className="text-xs opacity-70">{format(d, 'MMM', { locale: es })}</span>
                }
              </button>
            );
          })}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-semibold capitalize text-foreground">
            {tituloFecha} · {data?.length ?? 0} actividades
          </h3>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="p-5">
            <ErrorState onReintentar={() => void refetch()} />
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState
              icono={CalendarClock}
              titulo="No hay actividades este día"
              descripcion="Agregá la primera actividad para que aparezca en la app de los residentes."
              accion={
                permisos.puedeCrear && (
                  <Button asChild>
                    <Link to="/horarios/nueva">
                      <Plus className="h-4 w-4" /> Agregar actividad
                    </Link>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Lugar</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Repetición</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <span className="inline-flex rounded-md bg-primary-50 px-2 py-1 text-sm font-bold text-primary-700">
                      {formatHora(a.hora_inicio)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{a.emoji_icono ?? a.tipo_actividad?.emoji ?? '📌'}</span>
                      <span className="font-medium text-foreground">{a.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.ubicacion?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.responsable ? `${a.responsable.nombre} ${a.responsable.apellido}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{etiquetaRecurrencia(a)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.activo ? 'success' : 'muted'}>{a.activo ? 'Activo' : 'Pausado'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {permisos.puedeEditar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
                          className="transition-all duration-150 hover:scale-110 active:scale-95 hover:bg-primary-50 hover:text-primary-700"
                          onClick={() => navigate(`/horarios/${a.id}/editar`)}
                        >
                          <Pencil className="h-4 w-4 text-primary-700" />
                        </Button>
                      )}
                      {permisos.puedeEditar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={a.activo ? 'Pausar' : 'Reactivar'}
                          disabled={toggle.isPending}
                          className="transition-all duration-150 hover:scale-110 active:scale-95 hover:bg-amber-50 hover:text-amber-600 disabled:hover:scale-100"
                          onClick={() => toggle.mutate({ id: a.id, activo: !a.activo, nombre: a.nombre })}
                        >
                          {a.activo ? (
                            <Pause className="h-4 w-4 text-brand-amber" />
                          ) : (
                            <Play className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      )}
                      {permisos.puedeEliminar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar"
                          className="transition-all duration-150 hover:scale-110 active:scale-95 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setAEliminar(a)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => !v && setAEliminar(null)}
        titulo="¿Eliminar actividad?"
        descripcion={`"${aEliminar?.nombre}" se eliminará de forma permanente y dejará de verse en la app.`}
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminar.mutate(
            { id: aEliminar.id, nombre: aEliminar.nombre },
            { onSuccess: () => setAEliminar(null) },
          );
        }}
      />
    </div>
  );
}
