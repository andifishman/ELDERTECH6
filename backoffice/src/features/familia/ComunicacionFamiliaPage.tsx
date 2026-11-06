// ========================================
// PANTALLA: ComunicacionFamiliaPage
// DESCRIPCIÓN:
// Lo que las familias le escriben al personal: consultas (por categoría),
// sugerencias y reclamos con seguimiento y respuesta, propuestas de
// actividades o talleres, y las categorías de consulta de la residencia.
// ========================================
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Inbox, Lightbulb, MessageSquareText, Plus, Tags } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState, LoadingState } from '@/components/common/states';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';
import type { CasoFamilia, EstadoCaso, EstadoPropuesta, PropuestaFamilia, TipoCaso } from '@/services/familiaService';
import { fechaHora } from './formato';
import { useActualizarCategoria, useCambiarEstadoCaso, useCasos, useCaso, useCategorias, useCrearCategoria, usePropuestas, useResponderCaso, useResponderPropuesta } from './useFamilia';

const TIPOS: Record<TipoCaso, { texto: string; variante: 'info' | 'purple' | 'danger' }> = {
  consulta: { texto: 'Consulta', variante: 'info' },
  sugerencia: { texto: 'Sugerencia', variante: 'purple' },
  reclamo: { texto: 'Reclamo', variante: 'danger' },
};

const ESTADOS: Record<EstadoCaso, { texto: string; variante: 'warning' | 'info' | 'success' }> = {
  pendiente: { texto: 'Pendiente', variante: 'warning' },
  en_proceso: { texto: 'En proceso', variante: 'info' },
  resuelta: { texto: 'Resuelta', variante: 'success' },
};

// ─── Consultas y reclamos ────────────────────────────────────────────────────

function CasoDialog({ id, onCerrar }: { id: string | null; onCerrar: () => void }) {
  const { puede } = useAuth();
  const casoQ = useCaso(id);
  const responder = useResponderCaso(id ?? '');
  const cambiarEstado = useCambiarEstadoCaso(id ?? '');
  const [texto, setTexto] = useState('');
  const puedeEditar = puede('familia_comunicacion', 'editar');
  const caso = casoQ.data?.caso;

  return (
    <Dialog open={!!id} onOpenChange={(v) => { if (!v) { setTexto(''); onCerrar(); } }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{caso?.asunto ?? 'Consulta'}</DialogTitle>
          <DialogDescription>
            {caso ? `${TIPOS[caso.tipo].texto}${caso.categoria_nombre ? ` · ${caso.categoria_nombre}` : ''} · de ${caso.familiar_nombre ?? 'un familiar'}${caso.residente_nombre ? ` · por ${caso.residente_nombre}` : ''}` : 'Cargando…'}
          </DialogDescription>
        </DialogHeader>
        {casoQ.isLoading && <LoadingState />}
        {casoQ.isError && <ErrorState mensaje={casoQ.error.message} onReintentar={() => void casoQ.refetch()} />}
        {caso && casoQ.data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={ESTADOS[caso.estado].variante}>{ESTADOS[caso.estado].texto}</Badge>
              {puedeEditar && (
                <Select value={caso.estado} onValueChange={(v) => cambiarEstado.mutate(v as EstadoCaso)} disabled={cambiarEstado.isPending}>
                  <SelectTrigger className="w-auto min-w-max" aria-label="Cambiar estado"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ESTADOS) as EstadoCaso[]).map((e) => <SelectItem key={e} value={e}>{ESTADOS[e].texto}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="mb-1 text-xs text-muted-foreground">{caso.familiar_nombre} · {fechaHora(caso.created_at)}</p>
                <p className="whitespace-pre-line break-words text-sm">{caso.descripcion}</p>
              </div>
              {casoQ.data.mensajes.map((m) => (
                <div key={m.id} className={cn('rounded-lg p-3', m.autor === 'personal' ? 'ml-6 bg-primary-50' : 'mr-6 bg-muted/50')}>
                  <p className="mb-1 text-xs text-muted-foreground">{m.autor === 'personal' ? 'Personal de la residencia' : caso.familiar_nombre} · {fechaHora(m.created_at)}</p>
                  <p className="whitespace-pre-line break-words text-sm">{m.texto}</p>
                </div>
              ))}
            </div>
            {puedeEditar && (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (texto.trim()) responder.mutate(texto.trim(), { onSuccess: () => setTexto('') });
                }}
              >
                <Label htmlFor="caso-respuesta">Tu respuesta</Label>
                <Textarea id="caso-respuesta" rows={4} value={texto} maxLength={4000} onChange={(e) => setTexto(e.target.value)} placeholder="La familia la ve en su app." />
                <div className="flex justify-end">
                  <Button type="submit" disabled={!texto.trim() || responder.isPending}>{responder.isPending ? 'Enviando…' : 'Responder'}</Button>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CasosTab() {
  const casosQ = useCasos();
  const [estado, setEstado] = useState<EstadoCaso | 'todos'>('todos');
  const [tipo, setTipo] = useState<TipoCaso | 'todos'>('todos');
  const [abierto, setAbierto] = useState<string | null>(null);

  const casos = useMemo(() => (casosQ.data ?? []).filter((c) => (estado === 'todos' || c.estado === estado) && (tipo === 'todos' || c.tipo === tipo)), [casosQ.data, estado, tipo]);

  if (casosQ.isLoading) return <LoadingState mensaje="Cargando consultas…" />;
  if (casosQ.isError) return <ErrorState mensaje={casosQ.error.message} onReintentar={() => void casosQ.refetch()} />;
  const todos = casosQ.data ?? [];
  const pendientes = todos.filter((c) => c.estado === 'pendiente').length;

  return (
    <div className="space-y-4">
      {todos.length === 0 ? (
        <EmptyState icono={Inbox} titulo="Todavía no hay consultas" descripcion="Acá aparecen las consultas, sugerencias y reclamos que mandan las familias." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={estado} onValueChange={(v) => setEstado(v as EstadoCaso | 'todos')}>
              <SelectTrigger className="w-auto min-w-max" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {(Object.keys(ESTADOS) as EstadoCaso[]).map((e) => <SelectItem key={e} value={e}>{ESTADOS[e].texto}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoCaso | 'todos')}>
              <SelectTrigger className="w-auto min-w-max" aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {(Object.keys(TIPOS) as TipoCaso[]).map((t) => <SelectItem key={t} value={t}>{TIPOS[t].texto}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{pendientes} pendiente{pendientes === 1 ? '' : 's'}</span>
          </div>
          {casos.length === 0 && <p className="text-sm text-muted-foreground">Ninguna coincide con los filtros.</p>}
          <div className="space-y-2">
            {casos.map((c: CasoFamilia) => (
              <Card key={c.id} className="cursor-pointer p-3 transition-shadow hover:shadow-md" onClick={() => setAbierto(c.id)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setAbierto(c.id)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant={TIPOS[c.tipo].variante}>{TIPOS[c.tipo].texto}</Badge>
                    {c.categoria_nombre && <Badge variant="outline">{c.categoria_nombre}</Badge>}
                    <span className="truncate font-medium">{c.asunto}</span>
                  </div>
                  <Badge variant={ESTADOS[c.estado].variante}>{ESTADOS[c.estado].texto}</Badge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {c.familiar_nombre ?? 'Familiar'}{c.residente_nombre ? ` · por ${c.residente_nombre}` : ''} · {fechaHora(c.created_at)}{c.cantidad_respuestas > 0 ? ` · ${c.cantidad_respuestas} mensaje${c.cantidad_respuestas === 1 ? '' : 's'}` : ''}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
      <CasoDialog id={abierto} onCerrar={() => setAbierto(null)} />
    </div>
  );
}

// ─── Propuestas ──────────────────────────────────────────────────────────────

const ESTADOS_PROPUESTA: Record<EstadoPropuesta, { texto: string; variante: 'warning' | 'info' | 'success' | 'muted' }> = {
  pendiente: { texto: 'Pendiente', variante: 'warning' },
  en_revision: { texto: 'En revisión', variante: 'info' },
  aceptada: { texto: 'Aceptada', variante: 'success' },
  no_posible: { texto: 'No es posible', variante: 'muted' },
};

function PropuestaDialog({ propuesta, onCerrar }: { propuesta: PropuestaFamilia | null; onCerrar: () => void }) {
  const responder = useResponderPropuesta();
  const [estado, setEstado] = useState<EstadoPropuesta>('en_revision');
  const [respuesta, setRespuesta] = useState('');
  const [cargadaDe, setCargadaDe] = useState<string | null>(null);

  if ((propuesta?.id ?? null) !== cargadaDe) {
    setCargadaDe(propuesta?.id ?? null);
    setEstado(propuesta && propuesta.estado !== 'pendiente' ? propuesta.estado : 'en_revision');
    setRespuesta(propuesta?.respuesta ?? '');
  }

  return (
    <Dialog open={!!propuesta} onOpenChange={(v) => !v && !responder.isPending && onCerrar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{propuesta?.titulo}</DialogTitle>
          <DialogDescription>{propuesta ? `${propuesta.tipo === 'ofrecerse' ? 'Se ofrece a darla' : 'Sugiere la actividad'} · ${propuesta.familiar_nombre ?? 'Familiar'} · ${fechaHora(propuesta.created_at)}` : ''}</DialogDescription>
        </DialogHeader>
        {propuesta && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              responder.mutate({ id: propuesta.id, estado, respuesta: respuesta.trim() || null }, { onSuccess: onCerrar });
            }}
          >
            <p className="whitespace-pre-line break-words rounded-lg bg-muted/50 p-3 text-sm">{propuesta.descripcion}</p>
            <div className="space-y-1.5">
              <Label htmlFor="prop-estado">Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as EstadoPropuesta)}>
                <SelectTrigger id="prop-estado"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ESTADOS_PROPUESTA) as EstadoPropuesta[]).map((e) => <SelectItem key={e} value={e}>{ESTADOS_PROPUESTA[e].texto}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-resp">Respuesta para la familia (opcional)</Label>
              <Textarea id="prop-resp" rows={4} value={respuesta} maxLength={2000} onChange={(e) => setRespuesta(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCerrar} disabled={responder.isPending}>Cancelar</Button>
              <Button type="submit" disabled={responder.isPending}>{responder.isPending ? 'Guardando…' : 'Guardar respuesta'}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PropuestasTab() {
  const { puede } = useAuth();
  const propuestasQ = usePropuestas();
  const [abierta, setAbierta] = useState<PropuestaFamilia | null>(null);

  if (propuestasQ.isLoading) return <LoadingState mensaje="Cargando propuestas…" />;
  if (propuestasQ.isError) return <ErrorState mensaje={propuestasQ.error.message} onReintentar={() => void propuestasQ.refetch()} />;
  const lista = propuestasQ.data ?? [];

  return (
    <div className="space-y-3">
      {lista.length === 0 ? (
        <EmptyState icono={Lightbulb} titulo="Todavía no hay propuestas" descripcion="Las familias pueden sugerir una actividad o taller, o ofrecerse a darlo." />
      ) : (
        lista.map((p) => (
          <Card key={p.id} className="p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{p.titulo}</h3>
                  <Badge variant="outline">{p.tipo === 'ofrecerse' ? 'Se ofrece a darla' : 'Sugerencia'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.familiar_nombre ?? 'Familiar'} · {fechaHora(p.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ESTADOS_PROPUESTA[p.estado].variante}>{ESTADOS_PROPUESTA[p.estado].texto}</Badge>
                {puede('familia_comunicacion', 'editar') && <Button variant="outline" size="sm" onClick={() => setAbierta(p)}>{p.estado === 'pendiente' ? 'Responder' : 'Ver / editar'}</Button>}
              </div>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{p.descripcion}</p>
            {p.respuesta && <p className="mt-2 rounded-lg bg-primary-50 p-2 text-sm"><strong>Respuesta:</strong> {p.respuesta}</p>}
          </Card>
        ))
      )}
      <PropuestaDialog propuesta={abierta} onCerrar={() => setAbierta(null)} />
    </div>
  );
}

// ─── Categorías ──────────────────────────────────────────────────────────────

function CategoriasTab() {
  const { puede } = useAuth();
  const categoriasQ = useCategorias();
  const crear = useCrearCategoria();
  const actualizar = useActualizarCategoria();
  const [nombre, setNombre] = useState('');

  if (categoriasQ.isLoading) return <LoadingState />;
  if (categoriasQ.isError) return <ErrorState mensaje={categoriasQ.error.message} onReintentar={() => void categoriasQ.refetch()} />;
  const categorias = categoriasQ.data ?? [];

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">Son las categorías que las familias eligen al mandar una consulta. Una categoría desactivada no se ofrece más, pero conserva las consultas viejas.</p>
      {puede('familia_comunicacion', 'crear') && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nombre.trim()) crear.mutate(nombre.trim(), { onSuccess: () => setNombre('') });
          }}
        >
          <Input value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} placeholder="Nueva categoría (ej. Visitas)" aria-label="Nombre de la nueva categoría" />
          <Button type="submit" className="shrink-0 gap-1.5" disabled={!nombre.trim() || crear.isPending}><Plus className="h-4 w-4" /> Agregar</Button>
        </form>
      )}
      <div className="space-y-2">
        {categorias.map((c) => (
          <Card key={c.id} className="flex items-center justify-between gap-3 p-3">
            <span className={cn('font-medium', !c.activa && 'text-muted-foreground line-through')}>{c.nombre}</span>
            {puede('familia_comunicacion', 'editar') && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`cat-${c.id}`} className="text-sm text-muted-foreground">{c.activa ? 'Activa' : 'Desactivada'}</Label>
                <Switch id={`cat-${c.id}`} checked={c.activa} disabled={actualizar.isPending} onCheckedChange={(v) => actualizar.mutate({ id: c.id, cambios: { activa: v } })} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

const TABS = ['consultas', 'propuestas', 'categorias'] as const;
type Tab = (typeof TABS)[number];

export function ComunicacionFamiliaPage() {
  const [params, setParams] = useSearchParams();
  const pedida = params.get('tab');
  const tab: Tab = TABS.includes(pedida as Tab) ? (pedida as Tab) : 'consultas';

  return (
    <div className="space-y-5">
      <PageHeader titulo="Comunicación con familias" descripcion="Consultas, sugerencias, reclamos y propuestas que mandan los familiares." />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="consultas" className="gap-1.5"><MessageSquareText className="h-4 w-4" /> Consultas y reclamos</TabsTrigger>
          <TabsTrigger value="propuestas" className="gap-1.5"><Lightbulb className="h-4 w-4" /> Propuestas</TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5"><Tags className="h-4 w-4" /> Categorías</TabsTrigger>
        </TabsList>
        <TabsContent value="consultas"><CasosTab /></TabsContent>
        <TabsContent value="propuestas"><PropuestasTab /></TabsContent>
        <TabsContent value="categorias"><CategoriasTab /></TabsContent>
      </Tabs>
    </div>
  );
}
