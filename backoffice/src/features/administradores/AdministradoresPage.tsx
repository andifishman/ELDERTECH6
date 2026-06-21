// ========================================
// PANTALLA: AdministradoresPage
// DESCRIPCIÓN:
// Gestión de roles de usuario. Exclusiva para super_admin.
// Permite cambiar el rol de un usuario entre 'residente'
// (sin acceso al backoffice) y 'admin' (con acceso).
// ========================================
import { useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff, Search, UserCog } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { iniciales } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { useAdministradores, useCambiarRol, SUPER_ADMIN_IDS, type PerfilAdmin } from './useAdministradores';

function BadgeRol({ rol }: { rol: string }) {
  if (rol === 'admin' || rol === 'staff') {
    return <Badge variant="success">Administrador</Badge>;
  }
  return <Badge variant="muted">Sin acceso</Badge>;
}

export function AdministradoresPage() {
  const { perfil: perfilActual } = useAuth();
  const { data, isLoading, isError, refetch } = useAdministradores();
  const cambiarRol = useCambiarRol();

  const [busqueda, setBusqueda] = useState('');
  const [confirmar, setConfirmar] = useState<{ perfil: PerfilAdmin; nuevoRol: 'admin' | 'residente' } | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return (data ?? []).filter((u) => u.username.toLowerCase().includes(q));
  }, [data, busqueda]);

  const handleAccion = (perfil: PerfilAdmin) => {
    if (SUPER_ADMIN_IDS.includes(perfil.id)) return;
    const esAdmin = perfil.rol === 'admin' || perfil.rol === 'staff';
    setConfirmar({ perfil, nuevoRol: esAdmin ? 'residente' : 'admin' });
  };

  const confirmarCambio = () => {
    if (!confirmar) return;
    cambiarRol.mutate(
      { id: confirmar.perfil.id, rol: confirmar.nuevoRol },
      { onSettled: () => setConfirmar(null) },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Administradores"
        descripcion="Gestioná quién puede acceder al backoffice."
      />

      <div className="rounded-lg border bg-amber-50 border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-semibold">¿Cómo funciona?</p>
        <p className="mt-1">
          Los usuarios con rol <strong>Administrador</strong> pueden iniciar sesión en este backoffice.
          Los usuarios con rol <strong>Sin acceso</strong> son residentes de la app móvil y no pueden entrar acá.
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por usuario…"
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <div className="p-5"><ErrorState onReintentar={() => void refetch()} /></div>
        ) : filtrados.length === 0 ? (
          <div className="p-5">
            <EmptyState icono={UserCog} titulo="Sin usuarios" descripcion="No se encontraron usuarios." />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[400px]">
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Acceso al backoffice</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((u) => {
                const esSuperAdmin = SUPER_ADMIN_IDS.includes(u.id);
                const esMiCuenta = u.id === perfilActual?.id;
                const esAdmin = u.rol === 'admin' || u.rol === 'staff';
                const puedeModificar = !esSuperAdmin && !esMiCuenta;

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{iniciales(u.username)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">
                          {u.username}
                          {esMiCuenta && <span className="ml-2 text-xs text-muted-foreground">(vos)</span>}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {esSuperAdmin
                        ? <Badge className="bg-primary-600 text-white hover:bg-primary-700">Super Admin</Badge>
                        : <BadgeRol rol={u.rol} />
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {puedeModificar ? (
                        <button
                          type="button"
                          onClick={() => handleAccion(u)}
                          disabled={cambiarRol.isPending}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                            esAdmin
                              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                              : 'bg-primary/10 text-primary-700 hover:bg-primary/20'
                          }`}
                        >
                          {esAdmin
                            ? <><ShieldOff className="h-3.5 w-3.5" /> Quitar acceso</>
                            : <><ShieldCheck className="h-3.5 w-3.5" /> Dar acceso</>
                          }
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        abierto={!!confirmar}
        onOpenChange={(v) => { if (!v) setConfirmar(null); }}
        titulo={confirmar?.nuevoRol === 'admin' ? '¿Dar acceso al backoffice?' : '¿Quitar acceso al backoffice?'}
        descripcion={
          confirmar?.nuevoRol === 'admin'
            ? `"${confirmar.perfil.username}" podrá iniciar sesión en el backoffice como administrador.`
            : `"${confirmar?.perfil.username}" ya no podrá acceder al backoffice.`
        }
        textoConfirmar={confirmar?.nuevoRol === 'admin' ? 'Dar acceso' : 'Quitar acceso'}
        variante={confirmar?.nuevoRol === 'admin' ? 'default' : 'destructive'}
        onConfirmar={confirmarCambio}
      />
    </div>
  );
}
