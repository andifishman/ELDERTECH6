// ========================================
// PANTALLA: TutorialesPage
// DESCRIPCIÓN:
// Gestión de contenido educativo (videos y guías). Grid
// de tarjetas con búsqueda, filtro por estado, nivel y
// acciones de edición/eliminación.
// ========================================
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, PlayCircle, FileText, Eye, GraduationCap, Search, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { usePermisos } from '@/hooks/usePermisos';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryClient';
import { useArticulos, useArticulosEliminados, useEliminarArticulo, useEliminarDefinitivamente, useRestaurarArticulo } from './useArticulos';
import type { TutorialConCategoria } from '@/types/database.types';

function diasRestantes(deletedAt: string): number {
  const ms = 7 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(deletedAt).getTime());
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

const NIVEL_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  principiante: { label: 'Principiante', variant: 'success' },
  intermedio: { label: 'Intermedio', variant: 'warning' },
  avanzado: { label: 'Avanzado', variant: 'danger' },
};

export function TutorialesPage() {
  const navigate = useNavigate();
  const permisos = usePermisos();
  const { data, isLoading, isError, refetch } = useArticulos();
  const eliminar = useEliminarArticulo();
  useRealtime('tutoriales', [queryKeys.tutoriales]);

  const eliminados = useArticulosEliminados();
  const restaurar = useRestaurarArticulo();
  const eliminarDef = useEliminarDefinitivamente();

  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<'todos' | 'publicado' | 'borrador' | 'papelera'>('todos');
  const [aEliminar, setAEliminar] = useState<TutorialConCategoria | null>(null);
  const [aEliminarDef, setAEliminarDef] = useState<TutorialConCategoria | null>(null);
  const [selectedEnPapelera, setSelectedEnPapelera] = useState<TutorialConCategoria | null>(null);

  const filtrados = useMemo(() => {
    return (data ?? []).filter((a) => {
      const okEstado = estado === 'todos' || (estado === 'publicado' ? a.activo : !a.activo);
      const okBusqueda = a.titulo.toLowerCase().includes(busqueda.toLowerCase());
      return okEstado && okBusqueda;
    });
  }, [data, estado, busqueda]);

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Gestión de Tutoriales"
        descripcion="Contenido educativo: videos y guías con estado y nivel."
        acciones={
          permisos.puedeCrear && (
            <Button asChild>
              <Link to="/tutoriales/nuevo">
                <Plus className="h-4 w-4" /> Nuevo contenido
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar contenido…" className="pl-9" />
        </div>
        <Tabs value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="publicado">Publicados</TabsTrigger>
            <TabsTrigger value="borrador">Borradores</TabsTrigger>
            <TabsTrigger value="papelera" className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
              Papelera
              {(eliminados.data?.length ?? 0) > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive/15 text-[10px] font-bold text-destructive">
                  {eliminados.data!.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {estado === 'papelera' ? (
        eliminados.isLoading ? (
          <LoadingState />
        ) : (eliminados.data ?? []).length === 0 ? (
          <EmptyState icono={Trash2} titulo="La papelera está vacía" descripcion="Los tutoriales eliminados aparecerán aquí." />
        ) : (
          <Card>
            <ul className="divide-y divide-border px-4">
              {(eliminados.data ?? []).map((a) => {
                const dias = a.deleted_at ? diasRestantes(a.deleted_at) : 7;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 py-3 px-1 text-left transition-colors hover:bg-accent/50 rounded-lg"
                      onClick={() => setSelectedEnPapelera(a)}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                        {a.thumbnail_url
                          ? <img src={a.thumbnail_url} alt="" className="h-full w-full object-cover" />
                          : a.formato === 'video'
                          ? <PlayCircle className="h-5 w-5 text-muted-foreground" />
                          : <FileText className="h-5 w-5 text-muted-foreground" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{a.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.deleted_at ? `Eliminado ${formatDistanceToNow(new Date(a.deleted_at), { addSuffix: true, locale: es })}` : ''}
                          {' · '}
                          <span className={dias <= 1 ? 'text-destructive font-medium' : dias <= 3 ? 'text-amber-600 font-medium' : ''}>
                            {dias === 0 ? 'Se elimina hoy' : `${dias}d restantes`}
                          </span>
                        </p>
                      </div>
                      <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )
      ) : isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onReintentar={() => void refetch()} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icono={GraduationCap}
          titulo="No hay contenido"
          descripcion="Creá tu primer tutorial o guía para los residentes."
          accion={permisos.puedeCrear && <Button asChild><Link to="/tutoriales/nuevo"><Plus className="h-4 w-4" /> Nuevo contenido</Link></Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((a) => (
            <Card key={a.id} className="flex flex-col overflow-hidden">
              <div className="relative flex aspect-video items-center justify-center bg-primary-50">
                {a.thumbnail_url ? (
                  <img src={a.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : a.formato === 'video' ? (
                  <PlayCircle className="h-12 w-12 text-primary/40" />
                ) : (
                  <FileText className="h-12 w-12 text-primary/40" />
                )}
                <Badge variant={a.formato === 'video' ? 'info' : 'purple'} className="absolute left-2 top-2 capitalize">
                  {a.formato}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 font-semibold text-foreground">{a.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.categoria?.nombre ?? 'Sin categoría'}
                  {a.duracion_segundos ? ` · ${Math.round(a.duracion_segundos / 60)} min` : ''}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={a.activo ? 'success' : 'muted'}>{a.activo ? 'Publicado' : 'Borrador'}</Badge>
                  <Badge variant={(NIVEL_BADGE[a.nivel] ?? NIVEL_BADGE['principiante']).variant}>{(NIVEL_BADGE[a.nivel] ?? NIVEL_BADGE['principiante']).label}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" /> Tutorial
                  </span>
                  <div className="flex gap-1">
                    {permisos.puedeEditar && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        className="transition-all duration-150 hover:scale-110 active:scale-95 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => navigate(`/tutoriales/${a.id}/editar`)}
                      >
                        <Pencil className="h-4 w-4 text-primary-700" />
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => !v && setAEliminar(null)}
        titulo="¿Mover a la papelera?"
        descripcion={`"${aEliminar?.titulo}" se moverá a la papelera. Podés restaurarlo después.`}
        textoConfirmar="Mover a papelera"
        cargando={eliminar.isPending}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminar.mutate({ id: aEliminar.id, titulo: aEliminar.titulo }, { onSuccess: () => setAEliminar(null) });
        }}
      />

      <ConfirmDialog
        abierto={!!aEliminarDef}
        onOpenChange={(v) => !v && setAEliminarDef(null)}
        titulo="¿Eliminar definitivamente?"
        descripcion={`"${aEliminarDef?.titulo}" se borrará para siempre y no se podrá recuperar.`}
        textoConfirmar="Eliminar para siempre"
        cargando={eliminarDef.isPending}
        onConfirmar={() => {
          if (!aEliminarDef) return;
          eliminarDef.mutate({ id: aEliminarDef.id, titulo: aEliminarDef.titulo }, { onSuccess: () => setAEliminarDef(null) });
        }}
      />

      {/* Dialog de detalle papelera */}
      <Dialog open={!!selectedEnPapelera} onOpenChange={(v) => !v && setSelectedEnPapelera(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          {/* Thumbnail */}
          <div className="relative flex h-40 items-center justify-center bg-muted">
            {selectedEnPapelera?.thumbnail_url
              ? <img src={selectedEnPapelera.thumbnail_url} alt="" className="h-full w-full object-cover" />
              : selectedEnPapelera?.formato === 'video'
              ? <PlayCircle className="h-16 w-16 text-muted-foreground/40" />
              : <FileText className="h-16 w-16 text-muted-foreground/40" />
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <Badge variant={selectedEnPapelera?.formato === 'video' ? 'info' : 'purple'} className="capitalize">
                {selectedEnPapelera?.formato}
              </Badge>
              <Badge variant={selectedEnPapelera?.activo ? 'success' : 'muted'}>
                {selectedEnPapelera?.activo ? 'Publicado' : 'Borrador'}
              </Badge>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-base leading-snug truncate">{selectedEnPapelera?.titulo}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedEnPapelera?.categoria?.nombre ?? 'Sin categoría'}
              </p>
            </div>

            {selectedEnPapelera && (() => {
              const dias = selectedEnPapelera.deleted_at ? diasRestantes(selectedEnPapelera.deleted_at) : 7;
              const pct = Math.round(((7 - dias) / 7) * 100);
              const urgente = dias <= 1;
              const alerta = dias <= 3;
              return (
                <div className={`rounded-lg border p-3 space-y-2 ${urgente ? 'border-destructive/30 bg-destructive/5' : alerta ? 'border-amber-300/50 bg-amber-50' : 'border-border bg-muted/40'}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {selectedEnPapelera.deleted_at
                        ? `Eliminado ${formatDistanceToNow(new Date(selectedEnPapelera.deleted_at), { addSuffix: true, locale: es })}`
                        : 'Eliminado recientemente'}
                    </span>
                    <span className={`font-semibold ${urgente ? 'text-destructive' : alerta ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {dias === 0 ? 'Se elimina hoy' : `${dias}d restantes`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/10">
                    <div
                      className={`h-1.5 rounded-full transition-all ${urgente ? 'bg-destructive' : alerta ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                disabled={restaurar.isPending}
                onClick={() => {
                  if (!selectedEnPapelera) return;
                  restaurar.mutate(
                    { id: selectedEnPapelera.id, titulo: selectedEnPapelera.titulo },
                    { onSuccess: () => setSelectedEnPapelera(null) },
                  );
                }}
              >
                <RotateCcw className="h-4 w-4" />
                {selectedEnPapelera?.activo ? 'Restaurar como publicado' : 'Restaurar como borrador'}
              </Button>
              {permisos.puedeEliminar && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setAEliminarDef(selectedEnPapelera);
                    setSelectedEnPapelera(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar definitivamente
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
