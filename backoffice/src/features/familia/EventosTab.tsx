import { useState } from 'react';
import { CalendarDays, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState, LoadingState } from '@/components/common/states';
import { useAuth } from '@/features/auth/AuthContext';
import type { EventoFamilia } from '@/services/familiaService';
import { aInputFechaHora, deInputFechaHora, fechaHora } from './formato';
import { useActualizarEvento, useCrearEvento, useEliminarEvento, useEventos, useInscripciones } from './useFamilia';

interface Campos {
  titulo: string;
  descripcion: string;
  lugar: string;
  inicia: string;
  termina: string;
  abierto: boolean;
  cupo: string;
}

const VACIO: Campos = { titulo: '', descripcion: '', lugar: '', inicia: '', termina: '', abierto: false, cupo: '' };

function EventoDialog({ evento, abierto, onCerrar }: { evento: EventoFamilia | null; abierto: boolean; onCerrar: () => void }) {
  const crear = useCrearEvento();
  const actualizar = useActualizarEvento();
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [cargadoDe, setCargadoDe] = useState<string | null>(null);

  // Al abrir para editar se cargan los valores del evento una sola vez.
  const clave = abierto ? (evento?.id ?? 'nuevo') : null;
  if (clave !== cargadoDe) {
    setCargadoDe(clave);
    setCampos(
      evento
        ? {
            titulo: evento.titulo,
            descripcion: evento.descripcion ?? '',
            lugar: evento.lugar ?? '',
            inicia: aInputFechaHora(evento.inicia_en),
            termina: aInputFechaHora(evento.termina_en),
            abierto: evento.abierto_inscripcion,
            cupo: evento.cupo ? String(evento.cupo) : '',
          }
        : VACIO,
    );
  }

  const cupoNumero = campos.cupo === '' ? null : Number(campos.cupo);
  const cupoValido = cupoNumero === null || (Number.isInteger(cupoNumero) && cupoNumero >= 1);
  const terminaValido = !campos.termina || !campos.inicia || campos.termina >= campos.inicia;
  const listo = campos.titulo.trim() !== '' && campos.inicia !== '' && cupoValido && terminaValido;
  const guardando = crear.isPending || actualizar.isPending;

  const guardar = () => {
    const input = {
      titulo: campos.titulo.trim(),
      descripcion: campos.descripcion.trim() || null,
      lugar: campos.lugar.trim() || null,
      iniciaEn: deInputFechaHora(campos.inicia),
      terminaEn: campos.termina ? deInputFechaHora(campos.termina) : null,
      abiertoInscripcion: campos.abierto,
      cupo: campos.abierto ? cupoNumero : null,
    };
    if (evento) actualizar.mutate({ id: evento.id, input }, { onSuccess: onCerrar });
    else crear.mutate(input, { onSuccess: onCerrar });
  };

  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setCampos((c) => ({ ...c, [k]: v }));

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !guardando && onCerrar()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evento ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
          <DialogDescription>Aparece en el Calendario de las familias. Si lo abrís a inscripción, cada familia puede anotarse y confirmar cuántas personas van.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-titulo">Título</Label>
            <Input id="ev-titulo" value={campos.titulo} maxLength={120} onChange={(e) => set('titulo', e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ev-inicia">Empieza</Label>
              <Input id="ev-inicia" type="datetime-local" value={campos.inicia} onChange={(e) => set('inicia', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-termina">Termina (opcional)</Label>
              <Input id="ev-termina" type="datetime-local" value={campos.termina} onChange={(e) => set('termina', e.target.value)} aria-invalid={!terminaValido} />
              {!terminaValido && <p className="text-sm text-destructive">No puede terminar antes de empezar.</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-lugar">Lugar (opcional)</Label>
            <Input id="ev-lugar" value={campos.lugar} maxLength={120} onChange={(e) => set('lugar', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Descripción (opcional)</Label>
            <Textarea id="ev-desc" rows={4} value={campos.descripcion} maxLength={2000} onChange={(e) => set('descripcion', e.target.value)} />
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="ev-abierto">Abierto a inscripción de familias</Label>
                <p className="text-sm text-muted-foreground">Las familias se anotan desde su app.</p>
              </div>
              <Switch id="ev-abierto" checked={campos.abierto} onCheckedChange={(v) => set('abierto', v)} />
            </div>
            {campos.abierto && (
              <div className="space-y-1.5">
                <Label htmlFor="ev-cupo">Cupo máximo de personas (vacío = sin límite)</Label>
                <Input id="ev-cupo" type="number" min={1} value={campos.cupo} onChange={(e) => set('cupo', e.target.value)} aria-invalid={!cupoValido} />
                {!cupoValido && <p className="text-sm text-destructive">Ingresá un número entero mayor a 0.</p>}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button disabled={!listo || guardando} onClick={guardar}>{guardando ? 'Guardando…' : evento ? 'Guardar cambios' : 'Crear evento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InscriptosDialog({ evento, onCerrar }: { evento: EventoFamilia | null; onCerrar: () => void }) {
  const q = useInscripciones(evento?.id ?? null);
  const lista = q.data ?? [];
  return (
    <Dialog open={!!evento} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evento?.titulo}</DialogTitle>
          <DialogDescription>{q.isSuccess ? `${lista.length} familia${lista.length === 1 ? '' : 's'} · ${lista.reduce((s, i) => s + i.personas, 0)} personas` : 'Cargando inscripciones…'}</DialogDescription>
        </DialogHeader>
        {q.isLoading && <LoadingState />}
        {q.isError && <ErrorState mensaje={q.error.message} onReintentar={() => void q.refetch()} />}
        {q.isSuccess && lista.length === 0 && <p className="text-sm text-muted-foreground">Todavía no se anotó nadie.</p>}
        <ul className="space-y-1.5">
          {lista.map((i) => (
            <li key={i.familiar_id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
              <span className="min-w-0 truncate"><strong>{i.nombre} {i.apellido}</strong> <span className="text-muted-foreground">{i.email}</span></span>
              <Badge variant="outline" className="shrink-0">{i.personas} {i.personas === 1 ? 'persona' : 'personas'}</Badge>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function EventosTab() {
  const { puede } = useAuth();
  const eventosQ = useEventos();
  const eliminar = useEliminarEvento();
  const [editando, setEditando] = useState<EventoFamilia | null>(null);
  const [dialogo, setDialogo] = useState(false);
  const [verInscriptos, setVerInscriptos] = useState<EventoFamilia | null>(null);
  const [aEliminar, setAEliminar] = useState<EventoFamilia | null>(null);

  if (eventosQ.isLoading) return <LoadingState mensaje="Cargando eventos…" />;
  if (eventosQ.isError) return <ErrorState mensaje={eventosQ.error.message} onReintentar={() => void eventosQ.refetch()} />;
  const eventos = eventosQ.data ?? [];

  const abrir = (e: EventoFamilia | null) => {
    setEditando(e);
    setDialogo(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {puede('familia_contenido', 'crear') && <Button onClick={() => abrir(null)} className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo evento</Button>}
      </div>
      {eventos.length === 0 ? (
        <EmptyState icono={CalendarDays} titulo="Todavía no hay eventos" descripcion="Cargá fiestas, festejos o visitas abiertas a las familias. Aparecen en su Calendario." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {eventos.map((e) => {
            const pasado = new Date(e.termina_en ?? e.inicia_en).getTime() < Date.now();
            return (
              <Card key={e.id} className={`space-y-2 p-4 ${pasado ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{e.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{fechaHora(e.inicia_en)}</p>
                    {e.lugar && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {e.lugar}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {pasado && <Badge variant="muted">Ya pasó</Badge>}
                    {e.abierto_inscripcion && <Badge variant="success">Con inscripción</Badge>}
                  </div>
                </div>
                {e.descripcion && <p className="line-clamp-2 text-sm text-muted-foreground">{e.descripcion}</p>}
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                  {e.abierto_inscripcion && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setVerInscriptos(e)}>
                      <Users className="h-4 w-4" /> {e.personas_inscriptas}{e.cupo ? `/${e.cupo}` : ''} anotados
                    </Button>
                  )}
                  <span className="flex-1" />
                  {puede('familia_contenido', 'editar') && <Button variant="ghost" size="icon" aria-label={`Editar ${e.titulo}`} onClick={() => abrir(e)}><Pencil className="h-4 w-4" /></Button>}
                  {puede('familia_contenido', 'eliminar') && <Button variant="ghost" size="icon" aria-label={`Eliminar ${e.titulo}`} onClick={() => setAEliminar(e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <EventoDialog evento={editando} abierto={dialogo} onCerrar={() => setDialogo(false)} />
      <InscriptosDialog evento={verInscriptos} onCerrar={() => setVerInscriptos(null)} />
      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => !v && setAEliminar(null)}
        titulo="¿Eliminar el evento?"
        descripcion={aEliminar ? `"${aEliminar.titulo}" deja de verse en el Calendario y se pierden las inscripciones.` : ''}
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => aEliminar && eliminar.mutate(aEliminar.id, { onSuccess: () => setAEliminar(null) })}
      />
    </div>
  );
}
