import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, X, Plus, Trash2, Upload, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingState } from '@/components/common/states';
import { cn } from '@/lib/utils';
import { notify } from '@/components/ui/toast';
import { subirImagenTutorial, type PasoInput } from '@/services/articulosService';
import { useArticulo, useCategoriasArticulo, useGuardarArticulo, usePasosTutorial } from './useArticulos';
import type { FormatoTutorial } from '@/types/database.types';

interface CamposPrincipales {
  titulo: string;
  descripcion: string;
  url_video: string;
  duracion_minutos: string;
}

const NIVELES = [
  { v: 'principiante', label: 'Principiante', dot: 'bg-primary' },
  { v: 'intermedio', label: 'Intermedio', dot: 'bg-amber-500' },
  { v: 'avanzado', label: 'Avanzado', dot: 'bg-red-500' },
] as const;

export function ArticuloFormPage() {
  const { id } = useParams();
  const esEdicion = !!id;
  const navigate = useNavigate();

  const { data: categorias, isLoading: cargandoCat } = useCategoriasArticulo();
  const { data: tutorial, isLoading: cargandoTut } = useArticulo(id);
  const { data: pasosExistentes } = usePasosTutorial(id);
  const guardar = useGuardarArticulo();

  // ── Diálogo inicial: cuántos pasos ──────────────────────────────────────────
  const [dialogAbierto, setDialogAbierto] = useState(!esEdicion);
  const [cantidadPasos, setCantidadPasos] = useState<number | null>(null);
  const [inputPasos, setInputPasos] = useState('3');

  // ── Campos principales ───────────────────────────────────────────────────────
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CamposPrincipales>();
  const [categoriaId, setCategoriaId] = useState('');
  const [formato, setFormato] = useState<FormatoTutorial>('video');
  const [nivel, setNivel] = useState<'principiante' | 'intermedio' | 'avanzado'>('principiante');
  const [loQueAprenderas, setLoQueAprenderas] = useState<string[]>(['']);

  // ── Thumbnail ────────────────────────────────────────────────────────────────
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailModo, setThumbnailModo] = useState<'url' | 'archivo'>('url');
  const [subiendoThumb, setSubiendoThumb] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);

  // ── Pasos ────────────────────────────────────────────────────────────────────
  const [pasos, setPasos] = useState<(PasoInput & { _imagenFile?: File })[]>([]);
  const [subiendoPaso, setSubiendoPaso] = useState<number | null>(null);

  // Precarga datos en modo edición
  useEffect(() => {
    if (!tutorial) return;
    reset({
      titulo: tutorial.titulo,
      descripcion: tutorial.descripcion ?? '',
      url_video: tutorial.url_video ?? '',
      duracion_minutos: tutorial.duracion_segundos ? String(Math.round(tutorial.duracion_segundos / 60)) : '',
    });
    setCategoriaId(tutorial.categoria_id ?? '');
    setFormato(tutorial.formato);
    setNivel(tutorial.nivel as any);
    setThumbnailUrl(tutorial.thumbnail_url ?? '');
    setLoQueAprenderas(tutorial.lo_que_aprenderas?.length ? tutorial.lo_que_aprenderas : ['']);
  }, [tutorial, reset]);

  useEffect(() => {
    if (pasosExistentes && pasosExistentes.length > 0) {
      setPasos(
        pasosExistentes.map((p) => ({
          orden: p.orden,
          titulo: p.titulo ?? '',
          descripcion: p.descripcion ?? '',
          imagen_url: p.imagen_url,
          tip: p.tip ?? '',
        })),
      );
      if (esEdicion) setCantidadPasos(pasosExistentes.length);
    }
  }, [pasosExistentes, esEdicion]);

  // Inicializar pasos vacíos cuando el usuario elige cantidad
  const confirmarPasos = () => {
    const n = Math.max(0, Math.min(20, Number(inputPasos) || 0));
    setCantidadPasos(n);
    if (n > 0 && pasos.length === 0) {
      setPasos(
        Array.from({ length: n }, (_, i) => ({
          orden: i + 1,
          titulo: '',
          descripcion: '',
          imagen_url: null,
          tip: '',
        })),
      );
    }
    setDialogAbierto(false);
  };

  // ── Helpers thumbnail ────────────────────────────────────────────────────────
  const subirThumb = async (archivo: File) => {
    setSubiendoThumb(true);
    try {
      const url = await subirImagenTutorial(archivo, 'thumbnails');
      setThumbnailUrl(url);
    } catch {
      notify.error('No se pudo subir la imagen');
    } finally {
      setSubiendoThumb(false);
    }
  };

  // ── Helpers pasos ────────────────────────────────────────────────────────────
  const actualizarPaso = (idx: number, campo: Partial<PasoInput>) => {
    setPasos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...campo } : p)));
  };

  const subirImagenPaso = async (idx: number, archivo: File) => {
    setSubiendoPaso(idx);
    try {
      const url = await subirImagenTutorial(archivo, 'pasos');
      actualizarPaso(idx, { imagen_url: url });
    } catch {
      notify.error('No se pudo subir la imagen del paso');
    } finally {
      setSubiendoPaso(null);
    }
  };

  const agregarPaso = () => {
    setPasos((prev) => [
      ...prev,
      { orden: prev.length + 1, titulo: '', descripcion: '', imagen_url: null, tip: '' },
    ]);
  };

  const eliminarPaso = (idx: number) => {
    setPasos((prev) => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, orden: i + 1 })));
  };

  // ── Lo que aprenderás ────────────────────────────────────────────────────────
  const actualizarAprendizaje = (idx: number, val: string) =>
    setLoQueAprenderas((prev) => prev.map((v, i) => (i === idx ? val : v)));

  const agregarAprendizaje = () => setLoQueAprenderas((prev) => [...prev, '']);
  const eliminarAprendizaje = (idx: number) =>
    setLoQueAprenderas((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ───────────────────────────────────────────────────────────────────
  const enviar = (campos: CamposPrincipales, publicar: boolean) => {
    const input = {
      titulo: campos.titulo,
      descripcion: campos.descripcion || null,
      categoria_id: categoriaId || null,
      formato,
      nivel,
      url_video: campos.url_video || null,
      thumbnail_url: thumbnailUrl || null,
      duracion_segundos: campos.duracion_minutos ? Number(campos.duracion_minutos) * 60 : null,
      lo_que_aprenderas: loQueAprenderas.filter(Boolean).length > 0 ? loQueAprenderas.filter(Boolean) : null,
      activo: publicar,
      pasos: pasos.map((p, i) => ({ ...p, orden: i + 1 })),
    };
    guardar.mutate({ id, input }, { onSuccess: () => navigate('/tutoriales') });
  };

  if (cargandoCat || (esEdicion && cargandoTut)) return <LoadingState mensaje="Cargando…" />;

  return (
    <>
      {/* Diálogo: cantidad de pasos */}
      <Dialog open={dialogAbierto} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>¿Cuántos pasos tiene este tutorial?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cada paso tiene título, descripción e imagen. Podés agregar o quitar pasos después.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={20}
                value={inputPasos}
                onChange={(e) => setInputPasos(e.target.value)}
                className="w-24 text-center text-lg"
              />
              <span className="text-sm text-muted-foreground">pasos (0 = sin pasos)</span>
            </div>
            <Button className="w-full" onClick={confirmarPasos}>
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <form className="space-y-5 pb-10">
        <PageHeader
          titulo={esEdicion ? 'Editar tutorial' : 'Nuevo tutorial'}
          descripcion="Completá los datos del contenido educativo."
        />

        {/* 1 · Contenido */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">1 · Contenido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                placeholder="Ej: Cómo usar WhatsApp paso a paso"
                {...register('titulo', { required: 'Ingresá un título' })}
              />
              {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger><SelectValue placeholder="Elegir categoría" /></SelectTrigger>
                  <SelectContent>
                    {(categorias ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.emoji} {c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Formato</Label>
                <Select value={formato} onValueChange={(v) => setFormato(v as FormatoTutorial)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="guia">Guía</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nivel de dificultad</Label>
              <div className="grid grid-cols-3 gap-3">
                {NIVELES.map((n) => (
                  <button
                    key={n.v}
                    type="button"
                    onClick={() => setNivel(n.v)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors',
                      nivel === n.v ? 'border-primary bg-primary-50 text-primary-700' : 'border-border hover:bg-accent',
                    )}
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full', n.dot)} /> {n.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Describí el contenido de forma clara y simple…"
                {...register('descripcion')}
              />
            </div>

            {/* Lo que aprenderás */}
            <div className="space-y-2">
              <Label>Lo que aprenderás (opcional)</Label>
              <div className="space-y-2">
                {loQueAprenderas.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder={`Punto ${idx + 1}…`}
                      value={item}
                      onChange={(e) => actualizarAprendizaje(idx, e.target.value)}
                    />
                    {loQueAprenderas.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => eliminarAprendizaje(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={agregarAprendizaje}>
                  <Plus className="h-4 w-4" /> Agregar punto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2 · Multimedia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">2 · Multimedia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Thumbnail */}
            <div className="space-y-2">
              <Label>Imagen de portada</Label>
              <div className="flex gap-2 rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => setThumbnailModo('url')}
                  className={cn('flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-colors', thumbnailModo === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                >
                  <LinkIcon className="h-4 w-4" /> URL
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailModo('archivo')}
                  className={cn('flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-colors', thumbnailModo === 'archivo' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                >
                  <Upload className="h-4 w-4" /> Subir archivo
                </button>
              </div>
              {thumbnailModo === 'url' ? (
                <Input
                  placeholder="https://..."
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={subiendoThumb}
                    onClick={() => thumbRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {subiendoThumb ? 'Subiendo…' : 'Elegir imagen'}
                  </Button>
                  <input
                    ref={thumbRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) subirThumb(f); }}
                  />
                  {thumbnailUrl && <span className="truncate text-xs text-muted-foreground">{thumbnailUrl.split('/').pop()}</span>}
                </div>
              )}
              {thumbnailUrl && (
                <img src={thumbnailUrl} alt="Preview" className="h-32 w-full rounded-lg object-cover" />
              )}
            </div>

            {/* Video URL + duración */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="url_video">Video (URL)</Label>
                <Input id="url_video" placeholder="https://youtube.com/…" {...register('url_video')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dur">Duración (min)</Label>
                <Input id="dur" type="number" min={0} placeholder="5" {...register('duracion_minutos')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3 · Pasos */}
        {(cantidadPasos !== null || pasos.length > 0) && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                3 · Pasos ({pasos.length})
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={agregarPaso}>
                <Plus className="h-4 w-4" /> Agregar paso
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {pasos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay pasos aún.</p>
              )}
              {pasos.map((paso, idx) => (
                <PasoEditor
                  key={idx}
                  indice={idx}
                  paso={paso}
                  cargando={subiendoPaso === idx}
                  onChange={(campo) => actualizarPaso(idx, campo)}
                  onSubirImagen={(archivo) => subirImagenPaso(idx, archivo)}
                  onEliminar={() => eliminarPaso(idx)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Acciones */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/tutoriales')}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={guardar.isPending}
            onClick={handleSubmit((c) => enviar(c, false), () => notify.error('Revisá los campos obligatorios'))}
          >
            Guardar borrador
          </Button>
          <Button
            type="button"
            disabled={guardar.isPending}
            onClick={handleSubmit((c) => enviar(c, true), () => notify.error('Revisá los campos obligatorios'))}
          >
            <Save className="h-4 w-4" /> {guardar.isPending ? 'Guardando…' : 'Publicar ahora'}
          </Button>
        </div>
      </form>
    </>
  );
}

// ── Sub-componente: editor de un paso ────────────────────────────────────────
interface PasoEditorProps {
  indice: number;
  paso: PasoInput;
  cargando: boolean;
  onChange: (campo: Partial<PasoInput>) => void;
  onSubirImagen: (archivo: File) => void;
  onEliminar: () => void;
}

function PasoEditor({ indice, paso, cargando, onChange, onSubirImagen, onEliminar }: PasoEditorProps) {
  const [expandido, setExpandido] = useState(true);
  const [modoImagen, setModoImagen] = useState<'url' | 'archivo'>(paso.imagen_url ? 'url' : 'url');
  const archivoRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-semibold text-sm">
          Paso {indice + 1}
          {paso.titulo ? ` — ${paso.titulo}` : ''}
        </span>
        <div className="flex items-center gap-2">
          <span
            onClick={(e) => { e.stopPropagation(); onEliminar(); }}
            className="text-destructive hover:text-destructive/80 p-1 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </span>
          {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expandido && (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
          <div className="space-y-1.5">
            <Label>Título del paso</Label>
            <Input
              placeholder={`Paso ${indice + 1}…`}
              value={paso.titulo}
              onChange={(e) => onChange({ titulo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Explicá qué hacer en este paso…"
              value={paso.descripcion}
              onChange={(e) => onChange({ descripcion: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Consejo (tip)</Label>
            <Input
              placeholder="Ej: Si no encontrás el botón, buscalo en la parte superior derecha…"
              value={paso.tip ?? ''}
              onChange={(e) => onChange({ tip: e.target.value })}
            />
          </div>

          {/* Imagen del paso */}
          <div className="space-y-2">
            <Label>Imagen del paso (opcional)</Label>
            <div className="flex gap-2 rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => setModoImagen('url')}
                className={cn('flex flex-1 items-center justify-center gap-2 rounded-md py-1 text-xs font-medium transition-colors', modoImagen === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
              >
                <LinkIcon className="h-3.5 w-3.5" /> URL
              </button>
              <button
                type="button"
                onClick={() => setModoImagen('archivo')}
                className={cn('flex flex-1 items-center justify-center gap-2 rounded-md py-1 text-xs font-medium transition-colors', modoImagen === 'archivo' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
              >
                <Upload className="h-3.5 w-3.5" /> Subir
              </button>
            </div>
            {modoImagen === 'url' ? (
              <Input
                placeholder="https://..."
                value={paso.imagen_url ?? ''}
                onChange={(e) => onChange({ imagen_url: e.target.value || null })}
              />
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cargando}
                  onClick={() => archivoRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {cargando ? 'Subiendo…' : 'Elegir imagen'}
                </Button>
                <input
                  ref={archivoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onSubirImagen(f); }}
                />
              </div>
            )}
            {paso.imagen_url && (
              <img src={paso.imagen_url} alt="" className="h-24 w-full rounded-lg object-cover" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
