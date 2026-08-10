// ========================================
// PANTALLA: UsuariosPage
// DESCRIPCIÓN:
// Alta y administración de usuarios de la app. Se elige un
// nombre de usuario y una sección; la contraseña es el DNI.
// No usa email ni foto de perfil. Activar/desactivar da o
// quita acceso a la app.
// ========================================
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Search, UserCog, Power, Wifi, WifiOff, ChevronsUpDown, ChevronUp, ChevronDown, KeyRound } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  useActualizarResidente,
  useCrearUsuario,
  useResetearPassword,
  useResidentes,
  useToggleResidente,
} from './useResidentes';
import { SECCIONES } from '@/types/database.types';
import { coincideBusqueda } from '@/lib/textSearch';
import type { Residente, SeccionResidente } from '@/types/database.types';
import type { ResidenteConCuenta } from '@/services/residentesService';

interface Campos {
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  username: string;
  dni: string;
  seccion: SeccionResidente | '';
}

const CAMPOS_VACIOS: Campos = {
  nombre: '', apellido: '', nombreCompleto: '', username: '', dni: '', seccion: '',
};

export function UsuariosPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useResidentes();
  const crearUsuario = useCrearUsuario();
  const actualizar = useActualizarResidente();
  const resetearPassword = useResetearPassword();
  const toggle = useToggleResidente();
  useRealtime('residentes', [['residentes']]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'habitacion' | 'seccion' | 'conexion'>('nombre');
  const [ordenDir, setOrdenDir] = useState<'asc' | 'desc'>('asc');
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Residente | null>(null);
  const [nuevoDni, setNuevoDni] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Campos>({
    defaultValues: CAMPOS_VACIOS,
  });
  const seccion = watch('seccion');

  const toggleOrden = (col: typeof ordenarPor) => {
    if (ordenarPor === col) setOrdenDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setOrdenarPor(col); setOrdenDir('asc'); }
  };

  const filtrados = useMemo(() => {
    let lista = (data ?? []).filter((r) => {
      if (!coincideBusqueda(`${r.nombre} ${r.apellido}`, busqueda)) return false;
      if (filtroEstado === 'activo' && !r.activo) return false;
      if (filtroEstado === 'inactivo' && r.activo) return false;
      if (!(r as ResidenteConCuenta).tiene_cuenta) return false;
      return true;
    });
    lista = [...lista].sort((a, b) => {
      let va: string | number = '', vb: string | number = '';
      if (ordenarPor === 'nombre') { va = `${a.nombre} ${a.apellido}`; vb = `${b.nombre} ${b.apellido}`; }
      else if (ordenarPor === 'habitacion') { va = a.habitacion ?? ''; vb = b.habitacion ?? ''; }
      else if (ordenarPor === 'seccion') { va = a.seccion ?? ''; vb = b.seccion ?? ''; }
      else if (ordenarPor === 'conexion') {
        va = a.ultima_conexion ? new Date(a.ultima_conexion).getTime() : 0;
        vb = b.ultima_conexion ? new Date(b.ultima_conexion).getTime() : 0;
      }
      if (va < vb) return ordenDir === 'asc' ? -1 : 1;
      if (va > vb) return ordenDir === 'asc' ? 1 : -1;
      return 0;
    });
    return lista;
  }, [data, busqueda, filtroEstado, ordenarPor, ordenDir]);

  const abrirNuevo = () => {
    setEditando(null);
    setNuevoDni('');
    reset(CAMPOS_VACIOS);
    setAbierto(true);
  };

  const abrirEditar = (r: Residente) => {
    setEditando(r);
    setNuevoDni('');
    reset({
      nombre: r.nombre,
      apellido: r.apellido,
      nombreCompleto: r.nombre_completo ?? '',
      username: '',
      dni: '',
      seccion: r.seccion ?? '',
    });
    setAbierto(true);
  };

  const onSubmit = (c: Campos) => {
    if (!editando) {
      crearUsuario.mutate(
        {
          nombre: c.nombre,
          apellido: c.apellido,
          nombre_completo: c.nombreCompleto.trim() || null,
          username: c.username,
          dni: c.dni,
          seccion: c.seccion || null,
        },
        { onSuccess: () => setAbierto(false) },
      );
      return;
    }

    actualizar.mutate(
      {
        id: editando.id,
        input: {
          nombre: c.nombre,
          apellido: c.apellido,
          nombre_completo: c.nombreCompleto.trim() || null,
          seccion: c.seccion || null,
        },
      },
      {
        onSuccess: () => {
          if (nuevoDni.trim()) {
            resetearPassword.mutate({ id: editando.id, dni: nuevoDni.trim() });
          }
          setAbierto(false);
        },
      },
    );
  };

  const guardando = crearUsuario.isPending || actualizar.isPending;

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Usuarios"
        descripcion="Creá y administrá los usuarios que acceden a la app. Elegís un nombre de usuario y la contraseña es el DNI."
        acciones={<Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Crear usuario</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar usuario…" className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Filtrar por:</span>
        <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as 'todos' | 'activo' | 'inactivo')}>
          <SelectTrigger className="w-auto min-w-max"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
          </SelectContent>
        </Select>
        {(filtroEstado !== 'todos' || busqueda) && (
          <Button variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltroEstado('todos'); }}>
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
            <EmptyState icono={UserCog} titulo="Sin usuarios" descripcion="Creá el primer usuario." accion={<Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Crear usuario</Button>} />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                {(['nombre', 'habitacion', 'seccion', 'conexion'] as const).map((col) => {
                  const labels = { nombre: 'Usuario', habitacion: 'Habitación', seccion: 'Sección', conexion: 'Última conexión' };
                  const Icon = ordenarPor !== col ? ChevronsUpDown : ordenDir === 'asc' ? ChevronUp : ChevronDown;
                  return (
                    <TableHead key={col}>
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
                        <AvatarFallback>{iniciales(`${r.nombre} ${r.apellido}`)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{r.nombre} {r.apellido}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.habitacion ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.seccion ?? '—'}</TableCell>
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
            <DialogTitle>{editando ? 'Editar usuario' : 'Crear usuario'}</DialogTitle>
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

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nombreCompleto">Nombre completo (opcional)</Label>
                <Input id="nombreCompleto" placeholder="Se usa como nombre en Hablemos, en vez de nombre + apellido" {...register('nombreCompleto')} />
              </div>

              {!editando && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Nombre de usuario</Label>
                    <Input
                      id="username"
                      autoCapitalize="none"
                      {...register('username', { required: 'Requerido', minLength: { value: 3, message: 'Mínimo 3 caracteres' } })}
                    />
                    {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dni">DNI (será la contraseña)</Label>
                    <Input id="dni" {...register('dni', { required: 'Requerido', minLength: { value: 4, message: 'Mínimo 4 caracteres' } })} />
                    {errors.dni && <p className="text-xs text-destructive">{errors.dni.message}</p>}
                  </div>
                </>
              )}

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Sección</Label>
                <Select value={seccion} onValueChange={(v) => setValue('seccion', v as SeccionResidente)}>
                  <SelectTrigger><SelectValue placeholder="Elegí una sección" /></SelectTrigger>
                  <SelectContent>
                    {SECCIONES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editando && (
                <div className="space-y-1.5 sm:col-span-2 rounded-lg border border-dashed p-3">
                  <Label htmlFor="nuevoDni" className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" /> Restablecer contraseña (nuevo DNI)
                  </Label>
                  <Input
                    id="nuevoDni"
                    placeholder="Dejar vacío para no cambiarla"
                    value={nuevoDni}
                    onChange={(e) => setNuevoDni(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
