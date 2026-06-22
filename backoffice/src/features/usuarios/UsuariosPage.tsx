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
import { Plus, Pencil, Search, UserCog, Power, Wifi, WifiOff, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
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
import type { ResidenteConCuenta } from '@/services/residentesService';

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
  const [filtroNivel, setFiltroNivel] = useState<NivelDificultad | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'habitacion' | 'piso' | 'nivel' | 'conexion'>('nombre');
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('asc');
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Residente | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Campos>({
    defaultValues: { nivel_dificultad: 'independiente' },
  });
  const nivel = watch('nivel_dificultad');

  const toggleOrden = (col: typeof ordenarPor) => {
    if (ordenarPor === col) setOrdenDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setOrdenarPor(col); setOrdenDir('asc'); }
  };

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    let lista = (data ?? []).filter((r) => {
      if (!`${r.nombre} ${r.apellido}`.toLowerCase().includes(q)) return false;
      if (filtroNivel !== 'todos' && r.nivel_dificultad !== filtroNivel) return false;
      if (filtroEstado === 'activo' && !r.activo) return false;
      if (filtroEstado === 'inactivo' && r.activo) return false;
      if (!(r as ResidenteConCuenta).tiene_cuenta) return false;
      return true;
    });
    lista = [...lista].sort((a, b) => {
      let va: string | number = '', vb: string | number = '';
      if (ordenarPor === 'nombre') { va = `${a.nombre} ${a.apellido}`; vb = `${b.nombre} ${b.apellido}`; }
      else if (ordenarPor === 'habitacion') { va = a.habitacion ?? ''; vb = b.habitacion ?? ''; }
      else if (ordenarPor === 'piso') { va = a.piso ?? ''; vb = b.piso ?? ''; }
      else if (ordenarPor === 'nivel') { va = a.nivel_dificultad; vb = b.nivel_dificultad; }
      else if (ordenarPor === 'conexion') {
        va = a.ultima_conexion ? new Date(a.ultima_conexion).getTime() : 0;
        vb = b.ultima_conexion ? new Date(b.ultima_conexion).getTime() : 0;
      }
      if (va < vb) return ordenDir === 'asc' ? -1 : 1;
      if (va > vb) return ordenDir === 'asc' ? 1 : -1;
      return 0;
    });
    return lista;
  }, [data, busqueda, filtroNivel, filtroEstado, ordenarPor, ordenDir]);

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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar residente…" className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Filtrar por:</span>
        <Select value={filtroNivel} onValueChange={(v) => setFiltroNivel(v as NivelDificultad | 'todos')}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue placeholder="Nivel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los niveles</SelectItem>
            <SelectItem value="independiente">Independiente</SelectItem>
            <SelectItem value="necesita_ayuda">Necesita ayuda</SelectItem>
            <SelectItem value="dependiente">Dependiente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as 'todos' | 'activo' | 'inactivo')}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
          </SelectContent>
        </Select>
        {(filtroNivel !== 'todos' || filtroEstado !== 'todos' || busqueda) && (
          <Button variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltroNivel('todos'); setFiltroEstado('todos'); }}>
            Limpiar filtros
          </Button>
        )}
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
                {(['nombre', 'habitacion', 'piso', 'nivel', 'conexion'] as const).map((col, i) => {
                  const labels = { nombre: 'Residente', habitacion: 'Habitación', piso: 'Piso', nivel: 'Nivel', conexion: 'Última conexión' };
                  const Icon = ordenarPor !== col ? ChevronsUpDown : ordenDir === 'asc' ? ChevronUp : ChevronDown;
                  return (
                    <TableHead key={col} className={i === 4 ? '' : ''}>
                      <button
                        type="button"
                        onClick={() => toggleOrden(col)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors font-medium"
                      >
                        {labels[col]}
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TableHead>
                  );
                })}
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
