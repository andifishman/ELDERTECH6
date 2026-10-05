// ========================================
// PANTALLA: GrupoDetailPage
// DESCRIPCIÓN:
// Nombre/descripción del grupo + lista de integrantes. Los grupos de
// sección son de solo lectura en cuanto a integrantes (se arman solos);
// los personalizados permiten sumar/sacar residentes.
// ========================================
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus, UserMinus, Search, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { iniciales, cn } from '@/lib/utils';
import { coincideBusqueda } from '@/lib/textSearch';
import { useAuth } from '@/features/auth/AuthContext';
import type { ResidenteDeGrupo } from '@/services/gruposService';
import {
  useActualizarGrupo,
  useAgregarMiembros,
  useGrupoDetalle,
  useQuitarMiembro,
  useResidentesDisponibles,
} from './useGrupos';

export function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { puede } = useAuth();
  const detalleQ = useGrupoDetalle(id);
  const actualizar = useActualizarGrupo();
  const quitar = useQuitarMiembro(id ?? '');

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [aQuitar, setAQuitar] = useState<ResidenteDeGrupo | null>(null);

  useEffect(() => {
    if (detalleQ.data) {
      setNombre(detalleQ.data.grupo.nombre);
      setDescripcion(detalleQ.data.grupo.descripcion ?? '');
    }
  }, [detalleQ.data]);

  if (detalleQ.isLoading) return <LoadingState mensaje="Cargando grupo…" />;
  if (detalleQ.isError || !detalleQ.data) return <ErrorState onReintentar={() => void detalleQ.refetch()} />;

  const { grupo, miembros } = detalleQ.data;
  const esSeccion = grupo.tipo === 'seccion';
  const puedeEditar = puede('grupos', 'editar');
  const puedeQuitar = puedeEditar && !esSeccion;

  const hayCambios = nombre.trim() !== grupo.nombre || (descripcion.trim() || null) !== grupo.descripcion;

  const guardar = () => {
    if (!nombre.trim()) return;
    actualizar.mutate({ id: grupo.id, input: { nombre: nombre.trim(), descripcion: descripcion.trim() || null } });
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/grupos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">{grupo.nombre}</h2>
            <Badge variant={esSeccion ? 'outline' : 'muted'}>{esSeccion ? 'Sección' : 'Personalizado'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{miembros.length} {miembros.length === 1 ? 'integrante' : 'integrantes'}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Datos del grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {esSeccion && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              Grupo de sección — sus integrantes se arman solos según la sección de cada residente. El nombre no se puede cambiar.
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={esSeccion || !puedeEditar} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} maxLength={300} disabled={!puedeEditar} />
          </div>
          {puedeEditar && (
            <Button size="sm" disabled={!hayCambios || actualizar.isPending} onClick={guardar} className="gap-1.5">
              <Save className="h-4 w-4" /> {actualizar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Integrantes</CardTitle>
          {puedeQuitar && (
            <Button size="sm" variant="outline" onClick={() => setMostrarAgregar((v) => !v)} className="gap-1.5">
              <UserPlus className="h-4 w-4" /> {mostrarAgregar ? 'Cerrar' : 'Agregar usuarios'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {mostrarAgregar && id && <AgregarIntegrantes grupoId={id} />}

          {miembros.length === 0 ? (
            <EmptyState icono={UserPlus} titulo="Sin integrantes" descripcion={esSeccion ? 'Todavía no hay residentes con esta sección asignada.' : 'Agregá residentes a este grupo.'} />
          ) : (
            <ul className="divide-y divide-border">
              {miembros.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary-50 text-xs text-primary-700">{iniciales(`${r.nombre} ${r.apellido}`)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.nombre} {r.apellido}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.habitacion ? `Hab. ${r.habitacion}` : r.seccion ?? 'Sin sección'}
                      {!r.activo && <span className="ml-1.5 text-destructive">· Inactivo</span>}
                    </p>
                  </div>
                  {puedeQuitar && (
                    <Button variant="ghost" size="icon" onClick={() => setAQuitar(r)} aria-label={`Quitar a ${r.nombre} del grupo`}>
                      <UserMinus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        abierto={!!aQuitar}
        onOpenChange={(v) => { if (!v) setAQuitar(null); }}
        titulo={`¿Quitar a ${aQuitar?.nombre} del grupo?`}
        descripcion="El residente sigue existiendo en el sistema, solo deja de pertenecer a este grupo."
        textoConfirmar="Quitar del grupo"
        variante="destructive"
        onConfirmar={() => {
          if (aQuitar) quitar.mutate(aQuitar.id);
          setAQuitar(null);
        }}
      />
    </div>
  );
}

function AgregarIntegrantes({ grupoId }: { grupoId: string }) {
  const disponiblesQ = useResidentesDisponibles(grupoId, true);
  const agregar = useAgregarMiembros(grupoId);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const disponibles = disponiblesQ.data ?? [];
  const filtrados = disponibles.filter((r) => coincideBusqueda(`${r.nombre} ${r.apellido}`, busqueda));
  const toggle = (idRes: string) => setSeleccionados((prev) => (prev.includes(idRes) ? prev.filter((x) => x !== idRes) : [...prev, idRes]));

  return (
    <div className={cn('space-y-2 rounded-lg border border-border bg-muted/20 p-3')}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar residente…" className="pl-9" />
        </div>
        <Button
          size="sm"
          disabled={seleccionados.length === 0 || agregar.isPending}
          onClick={() => { agregar.mutate(seleccionados, { onSuccess: () => setSeleccionados([]) }); }}
        >
          Agregar {seleccionados.length > 0 ? `(${seleccionados.length})` : ''}
        </Button>
      </div>
      {disponiblesQ.isLoading ? (
        <p className="p-2 text-xs text-muted-foreground">Cargando residentes…</p>
      ) : filtrados.length === 0 ? (
        <p className="p-2 text-xs text-muted-foreground">{disponibles.length === 0 ? 'Todos los residentes activos ya están en este grupo.' : 'Sin resultados.'}</p>
      ) : (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md bg-background">
          {filtrados.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
              <span className="truncate">
                {r.nombre} {r.apellido}
                {r.seccion ? <span className="text-xs text-muted-foreground"> · {r.seccion}</span> : null}
              </span>
              <input type="checkbox" checked={seleccionados.includes(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
