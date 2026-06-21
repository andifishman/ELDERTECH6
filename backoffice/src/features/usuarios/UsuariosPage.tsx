// ========================================
// PANTALLA: UsuariosPage
// DESCRIPCIÓN:
// Administración de residentes: tabla con foto, datos y
// estado. Alta/edición en un diálogo modal y activación/
// desactivación (que da o quita acceso a la app).
// ========================================
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Search, UserCog, Power, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { iniciales } from '@/lib/utils';
import { useRealtime } from '@/hooks/useRealtime';
import { useGuardarResidente, useResidentes, useToggleResidente } from './useResidentes';
import type { NivelDificultad, Residente } from '@/types/database.types';

interface Campos {
  nombre: string;
  apellido: string;
  habitacion: string;
  piso: string;
  fecha_nacimiento: string;
  email: string;
  telefono: string;
  nivel_dificultad: NivelDificultad;
}

const NIVEL_LABEL: Record<NivelDificultad, string> = {
  independiente: 'Independiente',
  necesita_ayuda: 'Necesita ayuda',
  dependiente: 'Dependiente',
};

export function UsuariosPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useResidentes();
  const guardar = useGuardarResidente();
  const toggle = useToggleResidente();
  useRealtime('residentes', [['residentes']]);

  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Residente | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Campos>({
    defaultValues: { nivel_dificultad: 'independiente' },
  });
  const nivel = watch('nivel_dificultad');

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return (data ?? []).filter((r) => `${r.nombre} ${r.apellido}`.toLowerCase().includes(q));
  }, [data, busqueda]);

  const abrirNuevo = () => {
    setEditando(null);
    reset({ nombre: '', apellido: '', habitacion: '', piso: '', fecha_nacimiento: '', email: '', telefono: '', nivel_dificultad: 'independiente' });
    setAbierto(true);
  };

  const abrirEditar = (r: Residente) => {
    setEditando(r);
    reset({
      nombre: r.nombre,
      apellido: r.apellido,
      habitacion: r.habitacion ?? '',
      piso: r.piso ?? '',
      fecha_nacimiento: r.fecha_nacimiento ?? '',
      email: r.email ?? '',
      telefono: r.telefono ?? '',
      nivel_dificultad: r.nivel_dificultad,
    });
    setAbierto(true);
  };

  const onSubmit = (c: Campos) => {
    const input = {
      nombre: c.nombre,
      apellido: c.apellido,
      habitacion: c.habitacion || null,
      piso: c.piso || null,
      fecha_nacimiento: c.fecha_nacimiento || null,
      email: c.email || null,
      telefono: c.telefono || null,
      nivel_dificultad: c.nivel_dificultad,
    };
    guardar.mutate({ id: editando?.id, input }, { onSuccess: () => setAbierto(false) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Usuarios"
        descripcion="Administración de residentes del geriátrico."
        acciones={<Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Nuevo residente</Button>}
      />

      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar residente…" className="pl-9" />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="p-5"><ErrorState onReintentar={() => void refetch()} /></div>
        ) : filtrados.length === 0 ? (
          <div className="p-5">
            <EmptyState icono={UserCog} titulo="Sin residentes" descripcion="Agregá el primer residente." accion={<Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Nuevo residente</Button>} />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Residente</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Última conexión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => navigate(`/usuarios/${r.id}`)}
                      className="flex items-center gap-3 rounded-md hover:underline text-left"
                    >
                      <Avatar className="h-9 w-9">
                        {r.foto_url && <AvatarImage src={r.foto_url} alt="" />}
                        <AvatarFallback>{iniciales(`${r.nombre} ${r.apellido}`)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{r.nombre} {r.apellido}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.habitacion ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.piso ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline">{NIVEL_LABEL[r.nivel_dificultad]}</Badge></TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {r.ultima_conexion
                        ? <><Wifi className="h-3.5 w-3.5 shrink-0 text-primary-500" />{formatDistanceToNow(new Date(r.ultima_conexion), { addSuffix: true, locale: es })}</>
                        : <><WifiOff className="h-3.5 w-3.5 shrink-0" />Sin conexión</>
                      }
                    </span>
                  </TableCell>
                  <TableCell><Badge variant={r.activo ? 'success' : 'muted'}>{r.activo ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => abrirEditar(r)}
                        className="flex flex-col items-center gap-0.5 rounded-md p-1.5 text-primary-700 hover:bg-accent transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="text-[10px] font-medium text-muted-foreground">Editar</span>
                      </button>
                      <button
                        type="button"
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: r.id, activo: !r.activo, nombre: `${r.nombre} ${r.apellido}` })}
                        className="flex flex-col items-center gap-0.5 rounded-md p-1.5 hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        <Power className={r.activo ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-primary'} />
                        <span className={`text-[10px] font-medium ${r.activo ? 'text-destructive' : 'text-primary'}`}>
                          {r.activo ? 'Desactivar' : 'Activar'}
                        </span>
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      {/* diálogo alta/edición */}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar residente' : 'Nuevo residente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" {...register('nombre', { required: 'Requerido' })} />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" {...register('apellido', { required: 'Requerido' })} />
                {errors.apellido && <p className="text-xs text-destructive">{errors.apellido.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="habitacion">Habitación</Label>
                <Input id="habitacion" {...register('habitacion')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="piso">Piso</Label>
                <Input id="piso" {...register('piso')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fnac">Fecha de nacimiento</Label>
                <Input id="fnac" type="date" {...register('fecha_nacimiento')} />
              </div>
              <div className="space-y-1.5">
                <Label>Nivel de dificultad</Label>
                <Select value={nivel} onValueChange={(v) => setValue('nivel_dificultad', v as NivelDificultad)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independiente">Independiente</SelectItem>
                    <SelectItem value="necesita_ayuda">Necesita ayuda</SelectItem>
                    <SelectItem value="dependiente">Dependiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...register('telefono')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
              <Button type="submit" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
