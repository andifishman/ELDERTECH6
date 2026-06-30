import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, MessageSquare, CalendarDays, HelpCircle, ChevronUp, ChevronDown, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/common/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { iniciales } from '@/lib/utils';
import { usePermisos } from '@/hooks/usePermisos';
import { useRealtime } from '@/hooks/useRealtime';
import { useAsistenteStats, useEliminarFaq, useFaqs, useGuardarFaq, useHistorialMensajes, useReordenarFaq } from './useAsistente';
import { queryKeys } from '@/lib/queryClient';
import type { Faq } from '@/types/backoffice.types';

interface Campos { pregunta: string; categoria: string; emoji: string; }

export function AsistentePage() {
  const permisos = usePermisos();
  const faqs = useFaqs();
  const stats = useAsistenteStats();
  const historial = useHistorialMensajes();
  const guardar = useGuardarFaq();
  const eliminar = useEliminarFaq();
  const reordenar = useReordenarFaq();
  useRealtime('faq_asistente', [queryKeys.faqs]);

  const [tab, setTab] = useState<'faqs' | 'historial'>('faqs');
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Faq | null>(null);
  const [aEliminar, setAEliminar] = useState<Faq | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Campos>();

  const lista = faqs.data ?? [];

  const mover = (idx: number, dir: -1 | 1) => {
    const arr = [...lista];
    const otro = idx + dir;
    if (otro < 0 || otro >= arr.length) return;
    const actualizado = arr.map((f, i) => {
      if (i === idx) return { id: f.id, orden: arr[otro].orden };
      if (i === otro) return { id: f.id, orden: arr[idx].orden };
      return { id: f.id, orden: f.orden };
    });
    reordenar.mutate(actualizado);
  };

  const abrirNuevo = () => { setEditando(null); reset({ pregunta: '', categoria: '', emoji: '' }); setAbierto(true); };
  const abrirEditar = (f: Faq) => { setEditando(f); reset({ pregunta: f.pregunta, categoria: f.categoria ?? '', emoji: f.emoji ?? '' }); setAbierto(true); };

  const onSubmit = (c: Campos) => {
    guardar.mutate(
      { id: editando?.id, input: { pregunta: c.pregunta, categoria: c.categoria || null, emoji: c.emoji || null, activo: true } },
      { onSuccess: () => setAbierto(false) },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Asistente / FAQ"
        descripcion="Gestión de conocimiento y métricas del asistente IA."
        acciones={permisos.puedeCrear && tab === 'faqs' && (
          <Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Nueva FAQ</Button>
        )}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard etiqueta="Consultas totales" valor={stats.data?.totalConsultas ?? 0} icono={MessageSquare} acento="blue" cargando={stats.isLoading} />
        <KpiCard etiqueta="Consultas hoy" valor={stats.data?.sesionesHoy ?? 0} icono={CalendarDays} acento="green" cargando={stats.isLoading} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="faqs">Preguntas frecuentes ({lista.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial de consultas</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'faqs' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Lista FAQ con ordenamiento */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Preguntas frecuentes</CardTitle></CardHeader>
            <CardContent>
              {faqs.isLoading ? <LoadingState /> : faqs.isError ? <ErrorState onReintentar={() => void faqs.refetch()} /> :
                lista.length === 0 ? (
                  <EmptyState icono={HelpCircle} titulo="Sin FAQ" descripcion="Agregá preguntas para que los residentes las vean en la app." />
                ) : (
                  <ul className="space-y-2">
                    {lista.map((f, idx) => (
                      <li key={f.id} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/30">
                        {/* Botones de orden */}
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => mover(idx, -1)}
                            disabled={idx === 0 || reordenar.isPending}
                            className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                            aria-label="Subir"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => mover(idx, 1)}
                            disabled={idx === lista.length - 1 || reordenar.isPending}
                            className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                            aria-label="Bajar"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          {f.emoji && <span className="mt-0.5 text-xl leading-none">{f.emoji}</span>}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground text-sm">{f.pregunta}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {f.categoria && <Badge variant="outline" className="text-xs">{f.categoria}</Badge>}
                              <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-1">
                          {permisos.puedeEditar && (
                            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => abrirEditar(f)}>
                              <Pencil className="h-4 w-4 text-primary-700" />
                            </Button>
                          )}
                          {permisos.puedeEliminar && (
                            <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => setAEliminar(f)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              }
            </CardContent>
          </Card>

          {/* Top preguntas */}
          <Card>
            <CardHeader><CardTitle className="text-base">Preguntas más realizadas</CardTitle></CardHeader>
            <CardContent>
              {stats.isLoading ? <LoadingState /> :
                (stats.data?.topPreguntas ?? []).length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Sin datos aún.</p>
                ) : (
                  <ol className="space-y-3">
                    {(stats.data?.topPreguntas ?? []).map((p, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground line-clamp-2">{p.pregunta}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.total} {p.total === 1 ? 'vez' : 'veces'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )
              }
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'historial' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Historial de consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historial.isLoading ? <LoadingState /> :
              (historial.data ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sin consultas registradas.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(historial.data ?? []).map((m) => (
                    <li key={m.id} className="flex items-start gap-3 py-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        {m.residente_foto && <AvatarImage src={m.residente_foto} alt="" />}
                        <AvatarFallback className="text-xs">
                          {m.residente_nombre ? iniciales(`${m.residente_nombre} ${m.residente_apellido ?? ''}`) : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {m.residente_nombre ? `${m.residente_nombre} ${m.residente_apellido ?? ''}` : 'Desconocido'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{m.contenido}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
          </CardContent>
        </Card>
      )}

      {/* Diálogo FAQ */}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editando ? 'Editar FAQ' : 'Nueva FAQ'}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Las FAQ aparecen como accesos rápidos en la app. El asistente IA responde automáticamente.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pregunta">Pregunta *</Label>
                <Input id="pregunta" placeholder="¿A qué hora es el almuerzo?" {...register('pregunta', { required: 'Requerido' })} />
                {errors.pregunta && <p className="text-xs text-destructive">{errors.pregunta.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emoji">Emoji</Label>
                <Input id="emoji" placeholder="🍽️" maxLength={4} {...register('emoji')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoría (opcional)</Label>
              <Input id="categoria" placeholder="Comidas, Actividades, Salud…" {...register('categoria')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
              <Button type="submit" disabled={guardar.isPending}>{guardar.isPending ? 'Guardando…' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => !v && setAEliminar(null)}
        titulo="¿Eliminar FAQ?"
        descripcion={`"${aEliminar?.pregunta}" se eliminará de la app.`}
        textoConfirmar="Eliminar"
        cargando={eliminar.isPending}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminar.mutate({ id: aEliminar.id, pregunta: aEliminar.pregunta }, { onSuccess: () => setAEliminar(null) });
        }}
      />
    </div>
  );
}
