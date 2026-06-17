// ========================================
// PANTALLA: AsistentePage
// DESCRIPCIÓN:
// Panel del asistente IA. Muestra estadísticas de uso y
// administra las FAQ (crear, editar, eliminar) que
// alimentan las respuestas del asistente en la app.
// ========================================
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, MessageSquare, AlertTriangle, Timer, HelpCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { KpiCard } from '@/components/common/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { usePermisos } from '@/hooks/usePermisos';
import { useRealtime } from '@/hooks/useRealtime';
import { useAsistenteStats, useEliminarFaq, useFaqs, useGuardarFaq } from './useAsistente';
import type { Faq } from '@/types/backoffice.types';

interface Campos {
  pregunta: string;
  respuesta: string;
  categoria: string;
}

export function AsistentePage() {
  const permisos = usePermisos();
  const faqs = useFaqs();
  const stats = useAsistenteStats();
  const guardar = useGuardarFaq();
  const eliminar = useEliminarFaq();
  useRealtime('faq', [['faqs']]);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Faq | null>(null);
  const [aEliminar, setAEliminar] = useState<Faq | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Campos>();

  const abrirNuevo = () => {
    setEditando(null);
    reset({ pregunta: '', respuesta: '', categoria: '' });
    setAbierto(true);
  };
  const abrirEditar = (f: Faq) => {
    setEditando(f);
    reset({ pregunta: f.pregunta, respuesta: f.respuesta, categoria: f.categoria ?? '' });
    setAbierto(true);
  };

  const onSubmit = (c: Campos) => {
    guardar.mutate(
      { id: editando?.id, input: { pregunta: c.pregunta, respuesta: c.respuesta, categoria: c.categoria || null, activo: true } },
      { onSuccess: () => setAbierto(false) },
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Asistente / FAQ"
        descripcion="Gestión de conocimiento y métricas del asistente IA."
        acciones={permisos.puedeCrear && <Button onClick={abrirNuevo}><Plus className="h-4 w-4" /> Nueva FAQ</Button>}
      />

      {/* estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard etiqueta="Consultas totales" valor={stats.data?.totalConsultas ?? 0} icono={MessageSquare} acento="blue" cargando={stats.isLoading} />
        <KpiCard etiqueta="Preguntas sin responder" valor={stats.data?.sinResponder ?? 0} icono={AlertTriangle} acento="amber" cargando={stats.isLoading} />
        <KpiCard
          etiqueta="Tiempo promedio de respuesta"
          valor={stats.data?.promedioMs != null ? `${stats.data.promedioMs} ms` : '—'}
          icono={Timer}
          acento="green"
          cargando={stats.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* lista de FAQ */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Preguntas frecuentes</CardTitle></CardHeader>
          <CardContent>
            {faqs.isLoading ? (
              <LoadingState />
            ) : faqs.isError ? (
              <ErrorState onReintentar={() => void faqs.refetch()} />
            ) : (faqs.data ?? []).length === 0 ? (
              <EmptyState icono={HelpCircle} titulo="Sin FAQ" descripcion="Agregá preguntas para alimentar al asistente." />
            ) : (
              <ul className="space-y-3">
                {(faqs.data ?? []).map((f) => (
                  <li key={f.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{f.pregunta}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{f.respuesta}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {f.categoria && <Badge variant="outline">{f.categoria}</Badge>}
                          <span className="text-xs text-muted-foreground">{f.veces_consultada} consultas</span>
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* top preguntas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Preguntas más realizadas</CardTitle></CardHeader>
          <CardContent>
            {(stats.data?.topPreguntas ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin datos aún.</p>
            ) : (
              <ol className="space-y-3">
                {(stats.data?.topPreguntas ?? []).map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{p.pregunta}</p>
                      <p className="text-xs text-muted-foreground">{p.total} veces</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* diálogo FAQ */}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editando ? 'Editar FAQ' : 'Nueva FAQ'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pregunta">Pregunta</Label>
              <Input id="pregunta" placeholder="¿A qué hora es el almuerzo?" {...register('pregunta', { required: 'Requerido' })} />
              {errors.pregunta && <p className="text-xs text-destructive">{errors.pregunta.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="respuesta">Respuesta</Label>
              <Textarea id="respuesta" rows={4} placeholder="El almuerzo se sirve a las 12:30 en el comedor." {...register('respuesta', { required: 'Requerido' })} />
              {errors.respuesta && <p className="text-xs text-destructive">{errors.respuesta.message}</p>}
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
        descripcion={`"${aEliminar?.pregunta}" se eliminará del conocimiento del asistente.`}
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
