// ========================================
// PANTALLA: GruposPage
// DESCRIPCIÓN:
// Lista de grupos — los de sección (sincronizados solos, no se borran) y
// los personalizados que arma el staff a mano. Desde acá se crea uno nuevo
// y se entra al detalle de cada uno para ver/editar integrantes.
// ========================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users2, Building2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { coincideBusqueda } from '@/lib/textSearch';
import { useAuth } from '@/features/auth/AuthContext';
import { useEliminarGrupo, useGruposLista } from './useGrupos';
import type { GrupoConCantidad } from '@/services/gruposService';

export function GruposPage() {
  const navigate = useNavigate();
  const { puede } = useAuth();
  const gruposQ = useGruposLista();
  const eliminar = useEliminarGrupo();
  const [busqueda, setBusqueda] = useState('');
  const [aEliminar, setAEliminar] = useState<GrupoConCantidad | null>(null);

  const grupos = gruposQ.data ?? [];
  const filtrados = useMemo(() => grupos.filter((g) => coincideBusqueda(g.nombre, busqueda)), [grupos, busqueda]);
  const deSeccion = filtrados.filter((g) => g.tipo === 'seccion');
  const personalizados = filtrados.filter((g) => g.tipo === 'personalizado');

  const puedeCrear = puede('grupos', 'crear');
  const puedeEliminar = puede('grupos', 'eliminar');

  if (gruposQ.isLoading) return <LoadingState mensaje="Cargando grupos…" />;
  if (gruposQ.isError) return <ErrorState onReintentar={() => void gruposQ.refetch()} />;

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Grupos"
        descripcion="Agrupá residentes por sección o a mano, y usalos como destinatarios en notificaciones y otras funciones."
        acciones={
          puedeCrear ? (
            <Button onClick={() => navigate('/grupos/nuevo')} className="gap-1.5">
              <Plus className="h-4 w-4" /> Crear grupo
            </Button>
          ) : undefined
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar grupo…" className="pl-9" />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icono={Users2} titulo="Sin resultados" descripcion="No encontramos ningún grupo con ese nombre." />
      ) : (
        <div className="space-y-6">
          {deSeccion.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> Grupos de sección
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deSeccion.map((g) => (
                  <GrupoCard key={g.id} grupo={g} onClick={() => navigate(`/grupos/${g.id}`)} />
                ))}
              </div>
            </section>
          )}

          {personalizados.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users2 className="h-3.5 w-3.5" /> Grupos personalizados
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {personalizados.map((g) => (
                  <GrupoCard
                    key={g.id}
                    grupo={g}
                    onClick={() => navigate(`/grupos/${g.id}`)}
                    onEliminar={puedeEliminar ? () => setAEliminar(g) : undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => { if (!v) setAEliminar(null); }}
        titulo={`¿Eliminar el grupo "${aEliminar?.nombre}"?`}
        descripcion="Los residentes no se eliminan, solo dejan de pertenecer a este grupo. Esta acción no se puede deshacer."
        textoConfirmar="Eliminar grupo"
        variante="destructive"
        onConfirmar={() => {
          if (aEliminar) eliminar.mutate(aEliminar.id);
          setAEliminar(null);
        }}
      />
    </div>
  );
}

function GrupoCard({ grupo, onClick, onEliminar }: { grupo: GrupoConCantidad; onClick: () => void; onEliminar?: () => void }) {
  return (
    <Card className="group relative overflow-hidden p-4 transition-colors hover:bg-muted/40">
      <button type="button" onClick={onClick} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold">{grupo.nombre}</p>
          <Badge variant="outline" className="shrink-0">{grupo.cantidad_residentes} {grupo.cantidad_residentes === 1 ? 'usuario' : 'usuarios'}</Badge>
        </div>
        {grupo.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{grupo.descripcion}</p>}
      </button>
      {onEliminar && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEliminar(); }}
          aria-label={`Eliminar grupo ${grupo.nombre}`}
          className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </Card>
  );
}
