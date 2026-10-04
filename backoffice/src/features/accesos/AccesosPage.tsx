// ========================================
// PANTALLA: AccesosPage
// DESCRIPCIÓN:
// El Super Super Admin decide, usuario por usuario, a qué módulos del
// backoffice puede entrar y qué puede hacer en cada uno (ver / crear /
// editar / eliminar). Guarda en modulo_usuario; el backend verifica esos
// permisos en cada request, así que no alcanza con saber la URL de una
// pantalla ni con llamar a la API directo.
// ========================================
import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Search, Save, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { iniciales, cn } from '@/lib/utils';
import { coincideBusqueda } from '@/lib/textSearch';
import type { AccionModulo, PermisoModulo } from '@/types/backoffice.types';
import { useGuardarPermisos, useModulos, useUsuariosConAccesos } from './useAccesos';

const ACCIONES: { clave: AccionModulo; etiqueta: string }[] = [
  { clave: 'ver', etiqueta: 'Ver' },
  { clave: 'crear', etiqueta: 'Crear' },
  { clave: 'editar', etiqueta: 'Editar' },
  { clave: 'eliminar', etiqueta: 'Eliminar' },
];

type Matriz = Record<string, PermisoModulo>;

function vacio(moduloId: string): PermisoModulo {
  return { moduloId, ver: false, crear: false, editar: false, eliminar: false };
}

function aMatriz(permisos: PermisoModulo[], moduloIds: string[]): Matriz {
  const m: Matriz = {};
  for (const id of moduloIds) m[id] = permisos.find((p) => p.moduloId === id) ?? vacio(id);
  return m;
}

function igual(a: Matriz, b: Matriz): boolean {
  return Object.keys(a).every((k) => ACCIONES.every((x) => a[k][x.clave] === b[k]?.[x.clave]));
}

export function AccesosPage() {
  const modulosQ = useModulos();
  const usuariosQ = useUsuariosConAccesos();
  const guardar = useGuardarPermisos();

  const [busqueda, setBusqueda] = useState('');
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [matriz, setMatriz] = useState<Matriz>({});
  const [pendienteCambio, setPendienteCambio] = useState<string | null>(null);

  const modulos = useMemo(() => (modulosQ.data ?? []).filter((m) => m.asignable), [modulosQ.data]);
  const moduloIds = useMemo(() => modulos.map((m) => m.id), [modulos]);
  const usuarios = usuariosQ.data ?? [];
  const seleccionado = usuarios.find((u) => u.id === seleccionadoId) ?? null;

  // Lo guardado del usuario seleccionado, para saber si hay cambios sin guardar
  const guardada = useMemo(() => aMatriz(seleccionado?.permisos ?? [], moduloIds), [seleccionado, moduloIds]);
  const hayCambios = !!seleccionado && !igual(matriz, guardada);

  // Al elegir otro usuario (o cuando llegan datos nuevos del servidor) se carga su matriz
  useEffect(() => {
    setMatriz(guardada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado?.id, usuariosQ.dataUpdatedAt, moduloIds.join(',')]);

  const filtrados = useMemo(() => usuarios.filter((u) => coincideBusqueda(u.username, busqueda)), [usuarios, busqueda]);

  const elegirUsuario = (id: string) => {
    if (id === seleccionadoId) return;
    if (hayCambios) setPendienteCambio(id);
    else setSeleccionadoId(id);
  };

  const cambiar = (moduloId: string, accion: AccionModulo, valor: boolean) => {
    setMatriz((prev) => {
      const p = { ...prev[moduloId] };
      p[accion] = valor;
      // Crear / editar / eliminar necesitan poder ver; sacar "ver" saca todo lo demás
      if (valor && accion !== 'ver') p.ver = true;
      if (!valor && accion === 'ver') {
        p.crear = false;
        p.editar = false;
        p.eliminar = false;
      }
      return { ...prev, [moduloId]: p };
    });
  };

  const fijarFila = (moduloId: string, todo: boolean) =>
    setMatriz((prev) => ({ ...prev, [moduloId]: { moduloId, ver: todo, crear: todo, editar: todo, eliminar: todo } }));

  const fijarTodo = (todo: boolean) => setMatriz(Object.fromEntries(moduloIds.map((id) => [id, { moduloId: id, ver: todo, crear: todo, editar: todo, eliminar: todo }])));

  const onGuardar = () => {
    if (!seleccionado) return;
    guardar.mutate({ usuarioId: seleccionado.id, permisos: Object.values(matriz).filter((p) => p.ver || p.crear || p.editar || p.eliminar) });
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Accesos" descripcion="Elegí a qué módulos puede entrar cada usuario del backoffice y qué puede hacer en cada uno." />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">¿Cómo funciona?</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>
            <strong>Ver</strong> permite entrar al módulo. <strong>Crear</strong>, <strong>Editar</strong> y <strong>Eliminar</strong> son permisos aparte: alguien puede ver Tutoriales sin poder modificarlos.
          </li>
          <li>Los permisos los verifica el servidor en cada acción: no se pueden saltear cambiando la URL ni llamando a la API directamente.</li>
          <li>Los cambios rigen de inmediato. Los Super Admin tienen acceso total y no aparecen acá.</li>
          <li>Para que alguien aparezca en esta lista, primero dale acceso al backoffice desde <strong>Administradores</strong>.</li>
        </ul>
      </div>

      {usuariosQ.isLoading || modulosQ.isLoading ? (
        <LoadingState />
      ) : usuariosQ.isError || modulosQ.isError ? (
        <ErrorState onReintentar={() => { void usuariosQ.refetch(); void modulosQ.refetch(); }} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Usuarios */}
          <Card className="overflow-hidden self-start">
            <div className="border-b p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar usuario…" className="pl-9" />
              </div>
            </div>
            {filtrados.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No hay usuarios con acceso al backoffice.</div>
            ) : (
              <ul className="max-h-[60vh] divide-y overflow-y-auto">
                {filtrados.map((u) => {
                  const cantidad = u.permisos.filter((p) => p.ver).length;
                  const activo = u.id === seleccionadoId;
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => elegirUsuario(u.id)}
                        className={cn('flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50', activo && 'bg-primary-50')}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{iniciales(u.username)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.esSuperAdmin ? 'Super Admin · acceso total' : `${cantidad} ${cantidad === 1 ? 'módulo' : 'módulos'}`}
                          </p>
                        </div>
                        {!u.activo && <Badge variant="muted">Deshabilitado</Badge>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Matriz */}
          {!seleccionado ? (
            <EmptyState icono={KeyRound} titulo="Elegí un usuario" descripcion="Seleccioná a alguien de la lista para ver y editar sus accesos." />
          ) : seleccionado.esSuperAdmin ? (
            <EmptyState icono={ShieldCheck} titulo="Cuenta Super Admin" descripcion="Tiene acceso total a todos los módulos y no se puede modificar ni bloquear desde acá." />
          ) : (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div>
                  <p className="text-base font-semibold">{seleccionado.username}</p>
                  <p className="text-xs text-muted-foreground">Administrador del backoffice{seleccionado.activo ? '' : ' · cuenta deshabilitada'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => fijarTodo(true)}>Marcar todo</Button>
                  <Button variant="outline" size="sm" onClick={() => fijarTodo(false)}>Quitar todo</Button>
                  <Button size="sm" onClick={onGuardar} disabled={!hayCambios || guardar.isPending} className="gap-1.5">
                    <Save className="h-4 w-4" /> {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Módulo</th>
                      {ACCIONES.map((a) => (
                        <th key={a.clave} className="px-3 py-2.5 text-center font-semibold">{a.etiqueta}</th>
                      ))}
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {modulos.map((m) => {
                      const p = matriz[m.id] ?? vacio(m.id);
                      const todoMarcado = p.ver && p.crear && p.editar && p.eliminar;
                      return (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <p className="font-medium">{m.nombre}</p>
                            {m.descripcion && <p className="text-xs text-muted-foreground">{m.descripcion}</p>}
                          </td>
                          {ACCIONES.map((a) => (
                            <td key={a.clave} className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={p[a.clave]}
                                onChange={(e) => cambiar(m.id, a.clave, e.target.checked)}
                                aria-label={`${a.etiqueta} en ${m.nombre}`}
                                className="h-5 w-5 cursor-pointer rounded border-border accent-primary-600"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-3 text-right">
                            <button type="button" onClick={() => fijarFila(m.id, !todoMarcado)} className="text-xs font-medium text-primary-700 hover:underline">
                              {todoMarcado ? 'Quitar' : 'Todo'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hayCambios && <p className="border-t bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">Tenés cambios sin guardar.</p>}
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        abierto={!!pendienteCambio}
        onOpenChange={(v) => { if (!v) setPendienteCambio(null); }}
        titulo="¿Descartar los cambios sin guardar?"
        descripcion="Cambiaste los accesos de este usuario y todavía no los guardaste. Si seguís, se pierden."
        textoConfirmar="Descartar y cambiar"
        variante="destructive"
        onConfirmar={() => { setSeleccionadoId(pendienteCambio); setPendienteCambio(null); }}
      />
    </div>
  );
}
