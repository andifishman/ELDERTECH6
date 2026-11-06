import { useState } from 'react';
import { Bell, CheckCircle2, Circle, Eye, Plus, Trash2 } from 'lucide-react';
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
import type { AvisoFamilia } from '@/services/familiaService';
import { aInputFechaHora, deInputFechaHora, fechaHora } from './formato';
import { useAvisos, useCrearAviso, useEliminarAviso, useLecturasAviso } from './useFamilia';

function NuevoAvisoDialog({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const crear = useCrearAviso();
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [importante, setImportante] = useState(false);
  const [programar, setProgramar] = useState(false);
  const [cuando, setCuando] = useState('');

  const cuandoValido = !programar || (cuando !== '' && new Date(deInputFechaHora(cuando)).getTime() > Date.now());
  const listo = titulo.trim() !== '' && texto.trim() !== '' && cuandoValido;

  const cerrar = () => {
    setTitulo('');
    setTexto('');
    setImportante(false);
    setProgramar(false);
    setCuando('');
    onCerrar();
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && !crear.isPending && cerrar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo aviso para las familias</DialogTitle>
          <DialogDescription>Lo ven todas las familias de la residencia y cada una confirma que lo leyó. Vas a poder ver quién lo leyó y quién no.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="aviso-titulo">Título</Label>
            <Input id="aviso-titulo" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aviso-texto">Mensaje</Label>
            <Textarea id="aviso-texto" rows={6} value={texto} maxLength={4000} onChange={(e) => setTexto(e.target.value)} />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="aviso-importante">Marcar como importante</Label>
              <p className="text-sm text-muted-foreground">Aparece destacado en el Inicio de cada familia hasta que lo confirme.</p>
            </div>
            <Switch id="aviso-importante" checked={importante} onCheckedChange={setImportante} />
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="aviso-programar">Programar para más tarde</Label>
                <p className="text-sm text-muted-foreground">Si no, se publica ahora.</p>
              </div>
              <Switch id="aviso-programar" checked={programar} onCheckedChange={(v) => { setProgramar(v); if (v && !cuando) setCuando(aInputFechaHora(new Date(Date.now() + 3_600_000).toISOString())); }} />
            </div>
            {programar && (
              <>
                <Input type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} aria-label="Fecha y hora de publicación" />
                {!cuandoValido && <p className="text-sm text-destructive">Elegí una fecha y hora futuras.</p>}
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar} disabled={crear.isPending}>Cancelar</Button>
          <Button
            disabled={!listo || crear.isPending}
            onClick={() => crear.mutate({ titulo: titulo.trim(), texto: texto.trim(), importante, ...(programar ? { publicarEn: deInputFechaHora(cuando) } : {}) }, { onSuccess: cerrar })}
          >
            {crear.isPending ? 'Publicando…' : programar ? 'Programar aviso' : 'Publicar aviso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LecturasDialog({ aviso, onCerrar }: { aviso: AvisoFamilia | null; onCerrar: () => void }) {
  const lecturasQ = useLecturasAviso(aviso?.id ?? null);
  const lecturas = lecturasQ.data ?? [];
  const leyeron = lecturas.filter((l) => l.leido_en);
  const faltan = lecturas.filter((l) => !l.leido_en);

  return (
    <Dialog open={!!aviso} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aviso?.titulo}</DialogTitle>
          <DialogDescription>{lecturasQ.isSuccess ? `${leyeron.length} de ${lecturas.length} familias lo confirmaron` : 'Cargando lecturas…'}</DialogDescription>
        </DialogHeader>
        {lecturasQ.isLoading && <LoadingState />}
        {lecturasQ.isError && <ErrorState mensaje={lecturasQ.error.message} onReintentar={() => void lecturasQ.refetch()} />}
        {lecturasQ.isSuccess && lecturas.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay familias dadas de alta.</p>}
        {faltan.length > 0 && (
          <section className="space-y-1.5">
            <h4 className="text-sm font-semibold">Todavía no lo leyeron ({faltan.length})</h4>
            {faltan.map((l) => (
              <div key={l.familiar_id} className="flex items-center gap-2 text-sm">
                <Circle className="h-4 w-4 shrink-0 text-amber-500" /> <span className="truncate">{l.nombre} {l.apellido}</span> <span className="truncate text-muted-foreground">{l.email}</span>
              </div>
            ))}
          </section>
        )}
        {leyeron.length > 0 && (
          <section className="space-y-1.5">
            <h4 className="text-sm font-semibold">Lo confirmaron ({leyeron.length})</h4>
            {leyeron.map((l) => (
              <div key={l.familiar_id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{l.nombre} {l.apellido}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{l.leido_en ? fechaHora(l.leido_en) : ''}</span>
              </div>
            ))}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AvisosTab() {
  const { puede } = useAuth();
  const avisosQ = useAvisos();
  const eliminar = useEliminarAviso();
  const [nuevo, setNuevo] = useState(false);
  const [verLecturas, setVerLecturas] = useState<AvisoFamilia | null>(null);
  const [aEliminar, setAEliminar] = useState<AvisoFamilia | null>(null);

  if (avisosQ.isLoading) return <LoadingState mensaje="Cargando avisos…" />;
  if (avisosQ.isError) return <ErrorState mensaje={avisosQ.error.message} onReintentar={() => void avisosQ.refetch()} />;
  const avisos = avisosQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {puede('familia_contenido', 'crear') && <Button onClick={() => setNuevo(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo aviso</Button>}
      </div>
      {avisos.length === 0 ? (
        <EmptyState icono={Bell} titulo="Todavía no hay avisos" descripcion="Los avisos llegan a todas las familias y cada una confirma que los leyó." />
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => {
            const programado = new Date(a.publicar_en).getTime() > Date.now();
            const porcentaje = a.cantidad_familias > 0 ? Math.round((a.cantidad_lecturas / a.cantidad_familias) * 100) : 0;
            return (
              <Card key={a.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{a.titulo}</h3>
                      {a.importante && <Badge variant="danger">Importante</Badge>}
                      {programado && <Badge variant="info">Programado · {fechaHora(a.publicar_en)}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{programado ? 'Sale' : 'Publicado'} el {fechaHora(a.publicar_en)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setVerLecturas(a)}><Eye className="h-4 w-4" /> {a.cantidad_lecturas}/{a.cantidad_familias} leyeron</Button>
                    {puede('familia_contenido', 'eliminar') && (
                      <Button variant="ghost" size="icon" aria-label={`Eliminar el aviso ${a.titulo}`} onClick={() => setAEliminar(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                </div>
                <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{a.texto}</p>
                {!programado && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Porcentaje de familias que lo leyeron">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <NuevoAvisoDialog abierto={nuevo} onCerrar={() => setNuevo(false)} />
      <LecturasDialog aviso={verLecturas} onCerrar={() => setVerLecturas(null)} />
      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => !v && setAEliminar(null)}
        titulo="¿Eliminar el aviso?"
        descripcion={aEliminar ? `"${aEliminar.titulo}" deja de verse en las familias y se pierde el registro de quién lo leyó.` : ''}
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => aEliminar && eliminar.mutate(aEliminar.id, { onSuccess: () => setAEliminar(null) })}
      />
    </div>
  );
}
