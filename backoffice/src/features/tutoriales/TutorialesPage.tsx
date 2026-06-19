// ========================================
// PANTALLA: TutorialesPage
// DESCRIPCIÓN:
// Gestión de contenido educativo (videos y guías). Grid
// de tarjetas con búsqueda, filtro por estado, nivel y
// acciones de edición/eliminación.
// ========================================
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, PlayCircle, FileText, Eye, GraduationCap, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { usePermisos } from '@/hooks/usePermisos';
import { useRealtime } from '@/hooks/useRealtime';
import { queryKeys } from '@/lib/queryClient';
import { useArticulos, useEliminarArticulo } from './useArticulos';
import type { TutorialConCategoria } from '@/types/database.types';

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

  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<'todos' | 'publicado' | 'borrador'>('todos');
  const [aEliminar, setAEliminar] = useState<TutorialConCategoria | null>(null);

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
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
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
        titulo="¿Eliminar contenido?"
        descripcion={`"${aEliminar?.titulo}" se eliminará y dejará de verse en la app.`}
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminar.mutate({ id: aEliminar.id, titulo: aEliminar.titulo }, { onSuccess: () => setAEliminar(null) });
        }}
      />
    </div>
  );
}
