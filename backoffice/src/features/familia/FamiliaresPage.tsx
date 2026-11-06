// ========================================
// PANTALLA: FamiliaresPage
// DESCRIPCIÓN:
// Alta de familiares y vínculos con los residentes. El personal carga el
// email del familiar, lo vincula a uno o más residentes y le llega una
// invitación por email. Un residente puede tener varios familiares y un
// familiar varios residentes. "Revocar" corta el acceso a ese residente al
// instante (no borra nada: queda registro y se puede reactivar).
// ========================================
import { useMemo, useState } from 'react';
import { Check, Inbox, Link2, Link2Off, Mail, Plus, Power, Search, UserRound, Users, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState, LoadingState } from '@/components/common/states';
import { useAuth } from '@/features/auth/AuthContext';
import { useResidentes } from '@/features/usuarios/useResidentes';
import { coincideBusqueda } from '@/lib/textSearch';
import { SECCION_EMPLEADO } from '@/types/database.types';
import { cn } from '@/lib/utils';
import type { Familiar, SolicitudAcceso, VinculoFamiliar } from '@/services/familiaService';
import { useActualizarFamiliar, useAprobarSolicitud, useCrearFamiliar, useFamiliares, useReactivarVinculo, useReinvitar, useRechazarSolicitud, useRevocarVinculo, useSolicitudes, useVincular } from './useFamilia';
import { fechaHora } from './formato';

const nombreResidente = (r: { nombre: string; apellido: string } | null) => (r ? `${r.nombre} ${r.apellido}`.trim() : 'Residente');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ResidenteOpcion {
  id: string;
  nombre: string;
  apellido: string;
  seccion: string | null;
}

/** Lista con buscador para elegir residentes (uno o varios). */
function SelectorResidentes({
  residentes,
  elegidos,
  parentescos,
  onToggle,
  onParentesco,
  excluir = [],
  unico = false,
  busquedaInicial = '',
}: {
  residentes: ResidenteOpcion[];
  elegidos: string[];
  parentescos: Record<string, string>;
  onToggle: (id: string) => void;
  onParentesco: (id: string, valor: string) => void;
  excluir?: string[];
  unico?: boolean;
  /** Texto con el que arranca el buscador (en un pedido de acceso: el nombre que dijo la persona) */
  busquedaInicial?: string;
}) {
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const visibles = useMemo(
    () => residentes.filter((r) => !excluir.includes(r.id) && (!busqueda.trim() || coincideBusqueda(`${r.nombre} ${r.apellido}`, busqueda))).slice(0, 60),
    [residentes, excluir, busqueda],
  );
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar residente…" className="pl-9" aria-label="Buscar residente" />
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
        {visibles.length === 0 && <p className="p-3 text-sm text-muted-foreground">No hay residentes para mostrar.</p>}
        {visibles.map((r) => {
          const activo = elegidos.includes(r.id);
          return (
            <div key={r.id} className={cn('flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5', activo && 'bg-primary-50')}>
              <button type="button" onClick={() => onToggle(r.id)} aria-pressed={activo} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
                <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center border text-[10px] text-white', unico ? 'rounded-full' : 'rounded', activo ? 'border-primary bg-primary' : 'border-input bg-card')}>{activo ? '✓' : ''}</span>
                <span className="truncate font-medium">{r.nombre} {r.apellido}</span>
                {r.seccion && <span className="shrink-0 text-xs text-muted-foreground">{r.seccion}</span>}
              </button>
              {activo && (
                <Input
                  value={parentescos[r.id] ?? ''}
                  onChange={(e) => onParentesco(r.id, e.target.value)}
                  placeholder="Parentesco (ej. hija)"
                  maxLength={60}
                  className="h-8 w-44"
                  aria-label={`Parentesco con ${r.nombre} ${r.apellido}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Alta de un familiar. Con `solicitud` es la aprobación de un pedido de acceso: los datos vienen cargados, el email no se
 * puede cambiar (se aprueba a quien lo pidió) y el buscador arranca con el nombre del residente que dijo.
 */
function AltaDialog({ abierto, onCerrar, residentes, solicitud = null }: { abierto: boolean; onCerrar: () => void; residentes: ResidenteOpcion[]; solicitud?: SolicitudAcceso | null }) {
  const crear = useCrearFamiliar();
  const aprobar = useAprobarSolicitud();
  const [datos, setDatos] = useState({ nombre: solicitud?.nombre ?? '', apellido: solicitud?.apellido ?? '', email: solicitud?.email ?? '', telefono: solicitud?.telefono ?? '' });
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [parentescos, setParentescos] = useState<Record<string, string>>({});
  const trabajando = crear.isPending || aprobar.isPending;

  const emailValido = EMAIL.test(datos.email.trim());
  const listo = datos.nombre.trim() && datos.apellido.trim() && emailValido && elegidos.length > 0;

  const cerrar = () => {
    setDatos({ nombre: '', apellido: '', email: '', telefono: '' });
    setElegidos([]);
    setParentescos({});
    onCerrar();
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !trabajando && cerrar()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{solicitud ? 'Aprobar solicitud de acceso' : 'Nuevo familiar'}</DialogTitle>
          <DialogDescription>Le llega un email con un link para entrar a la app de familiares. Después entra solo con su email, sin contraseña.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {solicitud && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Dijo ser familiar de <strong>{solicitud.residente_texto ?? '—'}</strong>{solicitud.parentesco ? ` (${solicitud.parentesco})` : ''}. Elegí abajo al residente correcto; si no es quien dice, rechazá la solicitud.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fam-nombre">Nombre</Label>
              <Input id="fam-nombre" value={datos.nombre} maxLength={80} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fam-apellido">Apellido</Label>
              <Input id="fam-apellido" value={datos.apellido} maxLength={80} onChange={(e) => setDatos({ ...datos, apellido: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fam-email">Email</Label>
            <Input id="fam-email" type="email" value={datos.email} maxLength={160} readOnly={!!solicitud} onChange={(e) => setDatos({ ...datos, email: e.target.value })} aria-invalid={datos.email !== '' && !emailValido} />
            {datos.email !== '' && !emailValido && <p className="text-sm text-destructive">Revisá el email.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fam-tel">Teléfono (opcional)</Label>
            <Input id="fam-tel" value={datos.telefono} maxLength={40} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Residentes que puede ver</Label>
            <SelectorResidentes
              residentes={residentes}
              elegidos={elegidos}
              parentescos={parentescos}
              busquedaInicial={solicitud?.residente_texto ?? ''}
              onToggle={(id) => {
                setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
                // En una solicitud, el parentesco que dijo la persona queda propuesto (se puede corregir).
                if (solicitud?.parentesco && !elegidos.includes(id)) setParentescos((p) => ({ ...p, [id]: p[id] ?? solicitud.parentesco ?? '' }));
              }}
              onParentesco={(id, v) => setParentescos((p) => ({ ...p, [id]: v }))}
            />
            {elegidos.length === 0 && <p className="text-sm text-muted-foreground">Elegí al menos uno.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar} disabled={trabajando}>Cancelar</Button>
          <Button
            disabled={!listo || trabajando}
            onClick={() => {
              const base = {
                nombre: datos.nombre.trim(),
                apellido: datos.apellido.trim(),
                telefono: datos.telefono.trim() || null,
                residentes: elegidos.map((residenteId) => ({ residenteId, parentesco: parentescos[residenteId]?.trim() || null })),
              };
              if (solicitud) aprobar.mutate({ id: solicitud.id, input: base }, { onSuccess: cerrar });
              else crear.mutate({ ...base, email: datos.email.trim().toLowerCase() }, { onSuccess: cerrar });
            }}
          >
            {trabajando ? 'Enviando…' : solicitud ? 'Aprobar y enviar invitación' : 'Dar de alta y enviar invitación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VincularDialog({ familiar, onCerrar, residentes }: { familiar: Familiar | null; onCerrar: () => void; residentes: ResidenteOpcion[] }) {
  const vincular = useVincular();
  const [elegido, setElegido] = useState<string[]>([]);
  const [parentescos, setParentescos] = useState<Record<string, string>>({});
  const ya = familiar?.vinculos.filter((v) => v.activo).map((v) => v.residente_id) ?? [];
  const residenteId = elegido[0];

  const cerrar = () => {
    setElegido([]);
    setParentescos({});
    onCerrar();
  };

  return (
    <Dialog open={!!familiar} onOpenChange={(v) => !v && !vincular.isPending && cerrar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Vincular otro residente</DialogTitle>
          <DialogDescription>{familiar ? `${familiar.nombre} ${familiar.apellido} va a poder ver a este residente.` : ''}</DialogDescription>
        </DialogHeader>
        <SelectorResidentes
          residentes={residentes}
          elegidos={elegido}
          parentescos={parentescos}
          excluir={ya}
          unico
          onToggle={(id) => setElegido((e) => (e[0] === id ? [] : [id]))}
          onParentesco={(id, v) => setParentescos((p) => ({ ...p, [id]: v }))}
        />
        <DialogFooter>
          <Button variant="outline" onClick={cerrar} disabled={vincular.isPending}>Cancelar</Button>
          <Button
            disabled={!familiar || !residenteId || vincular.isPending}
            onClick={() => familiar && residenteId && vincular.mutate({ familiarId: familiar.id, residenteId, parentesco: parentescos[residenteId]?.trim() || null }, { onSuccess: cerrar })}
          >
            {vincular.isPending ? 'Vinculando…' : 'Vincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FamiliaresPage() {
  const { puede } = useAuth();
  const familiaresQ = useFamiliares();
  const residentesQ = useResidentes();
  const actualizar = useActualizarFamiliar();
  const reinvitar = useReinvitar();
  const revocar = useRevocarVinculo();
  const reactivar = useReactivarVinculo();
  const solicitudesQ = useSolicitudes();
  const rechazar = useRechazarSolicitud();
  const [aAprobar, setAAprobar] = useState<SolicitudAcceso | null>(null);
  const [aRechazar, setARechazar] = useState<SolicitudAcceso | null>(null);
  const pendientes = (solicitudesQ.data ?? []).filter((s) => s.estado === 'pendiente');

  const [busqueda, setBusqueda] = useState('');
  const [alta, setAlta] = useState(false);
  const [aVincular, setAVincular] = useState<Familiar | null>(null);
  const [aRevocar, setARevocar] = useState<{ familiar: Familiar; vinculo: VinculoFamiliar } | null>(null);
  const [aDeshabilitar, setADeshabilitar] = useState<Familiar | null>(null);

  const puedeCrear = puede('familiares', 'crear');
  const puedeEditar = puede('familiares', 'editar');

  const residentes = useMemo<ResidenteOpcion[]>(
    () => (residentesQ.data ?? []).filter((r) => r.activo && r.seccion !== SECCION_EMPLEADO).map((r) => ({ id: r.id, nombre: r.nombre, apellido: r.apellido, seccion: r.seccion ?? null })),
    [residentesQ.data],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim();
    return (familiaresQ.data ?? []).filter(
      (f) => !q || coincideBusqueda(`${f.nombre} ${f.apellido} ${f.email} ${f.vinculos.map((v) => nombreResidente(v.residente)).join(' ')}`, q),
    );
  }, [familiaresQ.data, busqueda]);

  if (familiaresQ.isLoading) return <LoadingState mensaje="Cargando familiares…" />;
  if (familiaresQ.isError) return <ErrorState mensaje={familiaresQ.error.message} onReintentar={() => void familiaresQ.refetch()} />;

  const total = familiaresQ.data?.length ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Familiares"
        descripcion="Quién es familiar de quién. Cada familiar solo ve a los residentes que vincules acá."
        acciones={puedeCrear ? <Button onClick={() => setAlta(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo familiar</Button> : undefined}
      />

      {pendientes.length > 0 && (
        <section aria-labelledby="solicitudes-titulo" className="space-y-3 rounded-xl border-2 border-amber-300 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-amber-800" />
            <h3 id="solicitudes-titulo" className="font-semibold text-amber-950">Solicitudes de acceso ({pendientes.length})</h3>
          </div>
          <p className="text-sm text-amber-900">Personas que intentaron entrar a la app de familiares sin estar dadas de alta. Aprobá solo si reconocés a la persona y al residente.</p>
          <div className="space-y-2">
            {pendientes.map((s) => (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-semibold">{`${s.nombre ?? ''} ${s.apellido ?? ''}`.trim() || 'Sin nombre'} <span className="font-normal text-muted-foreground">· {s.email}</span></p>
                  <p className="text-sm">
                    Dice ser familiar de <strong>{s.residente_texto ?? '—'}</strong>{s.parentesco ? ` (${s.parentesco})` : ''}{s.telefono ? ` · Tel. ${s.telefono}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{fechaHora(s.created_at)}{s.intentos > 1 ? ` · lo intentó ${s.intentos} veces` : ''}</p>
                </div>
                {(puedeCrear || puedeEditar) && (
                  <div className="flex shrink-0 gap-2">
                    {puedeCrear && <Button size="sm" className="gap-1.5" onClick={() => setAAprobar(s)}><Check className="h-4 w-4" /> Aprobar</Button>}
                    {puedeEditar && <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => setARechazar(s)}><X className="h-4 w-4" /> Rechazar</Button>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {total === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Todavía no hay familiares"
          descripcion="Dá de alta al primero: cargá su email, elegí a qué residente(s) vincularlo y le llega la invitación."
          accion={puedeCrear ? <Button onClick={() => setAlta(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo familiar</Button> : undefined}
        />
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por familiar, email o residente…" className="pl-9" aria-label="Buscar familiares" />
          </div>

          {filtrados.length === 0 && <p className="text-sm text-muted-foreground">Ningún familiar coincide con la búsqueda.</p>}

          <div className="grid gap-3 lg:grid-cols-2">
            {filtrados.map((f) => {
              const activos = f.vinculos.filter((v) => v.activo);
              const revocados = f.vinculos.filter((v) => !v.activo);
              return (
                <Card key={f.id} className={cn('space-y-3 p-4', !f.activo && 'opacity-70')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"><UserRound className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{f.nombre} {f.apellido}</p>
                        <p className="truncate text-sm text-muted-foreground">{f.email}{f.telefono ? ` · ${f.telefono}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {!f.activo ? <Badge variant="muted">Deshabilitado</Badge> : f.ultimo_acceso ? <Badge variant="success">Activo</Badge> : <Badge variant="warning">Invitación pendiente</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {f.ultimo_acceso ? `Entró ${formatDistanceToNow(new Date(f.ultimo_acceso), { addSuffix: true, locale: es })}` : f.invitado_en ? `Invitado ${formatDistanceToNow(new Date(f.invitado_en), { addSuffix: true, locale: es })}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ve a</p>
                    {activos.length === 0 && <p className="text-sm text-muted-foreground">Ningún residente vinculado: no ve nada.</p>}
                    {activos.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                        <span className="min-w-0 truncate"><strong>{nombreResidente(v.residente)}</strong>{v.parentesco ? <span className="text-muted-foreground"> · {v.parentesco}</span> : null}</span>
                        {puedeEditar && (
                          <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-destructive hover:text-destructive" onClick={() => setARevocar({ familiar: f, vinculo: v })}>
                            <Link2Off className="h-4 w-4" /> Revocar
                          </Button>
                        )}
                      </div>
                    ))}
                    {revocados.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground">
                        <span className="min-w-0 truncate line-through">{nombreResidente(v.residente)}</span>
                        {puedeEditar && (
                          <Button variant="ghost" size="sm" className="shrink-0 gap-1" disabled={reactivar.isPending} onClick={() => reactivar.mutate(v.id)}>
                            <Link2 className="h-4 w-4" /> Reactivar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {puedeEditar && (
                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAVincular(f)} disabled={!f.activo}><Link2 className="h-4 w-4" /> Vincular otro residente</Button>
                      {!f.ultimo_acceso && f.activo && (
                        <Button variant="outline" size="sm" className="gap-1.5" disabled={reinvitar.isPending} onClick={() => reinvitar.mutate(f.id)}><Mail className="h-4 w-4" /> Reenviar invitación</Button>
                      )}
                      {f.activo ? (
                        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setADeshabilitar(f)}><Power className="h-4 w-4" /> Deshabilitar</Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="gap-1.5" disabled={actualizar.isPending} onClick={() => actualizar.mutate({ id: f.id, cambios: { activo: true } })}><Power className="h-4 w-4" /> Habilitar</Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <AltaDialog abierto={alta} onCerrar={() => setAlta(false)} residentes={residentes} />
      <AltaDialog key={aAprobar?.id ?? 'sin-solicitud'} abierto={!!aAprobar} onCerrar={() => setAAprobar(null)} residentes={residentes} solicitud={aAprobar} />
      <ConfirmDialog
        abierto={!!aRechazar}
        onOpenChange={(v) => !v && setARechazar(null)}
        titulo="¿Rechazar la solicitud?"
        descripcion={aRechazar ? `${aRechazar.email} no va a tener acceso a la app de familiares. No se le avisa por email; si lo vuelve a intentar, se crea una solicitud nueva.` : ''}
        textoConfirmar="Rechazar"
        cargando={rechazar.isPending}
        onConfirmar={() => aRechazar && rechazar.mutate(aRechazar.id, { onSuccess: () => setARechazar(null) })}
      />
      <VincularDialog familiar={aVincular} onCerrar={() => setAVincular(null)} residentes={residentes} />

      <ConfirmDialog
        abierto={!!aRevocar}
        onOpenChange={(v) => !v && setARevocar(null)}
        titulo="¿Revocar el vínculo?"
        descripcion={aRevocar ? `${aRevocar.familiar.nombre} ${aRevocar.familiar.apellido} deja de ver todo lo de ${nombreResidente(aRevocar.vinculo.residente)} (agenda, mensajes). No se borra nada y se puede reactivar.` : ''}
        textoConfirmar="Revocar"
        cargando={revocar.isPending}
        onConfirmar={() => aRevocar && revocar.mutate(aRevocar.vinculo.id, { onSuccess: () => setARevocar(null) })}
      />
      <ConfirmDialog
        abierto={!!aDeshabilitar}
        onOpenChange={(v) => !v && setADeshabilitar(null)}
        titulo="¿Deshabilitar la cuenta?"
        descripcion={aDeshabilitar ? `${aDeshabilitar.nombre} ${aDeshabilitar.apellido} no va a poder entrar a la app hasta que la vuelvas a habilitar. Sus vínculos se conservan.` : ''}
        textoConfirmar="Deshabilitar"
        onConfirmar={() => aDeshabilitar && actualizar.mutate({ id: aDeshabilitar.id, cambios: { activo: false } }, { onSuccess: () => setADeshabilitar(null) })}
      />
    </div>
  );
}
