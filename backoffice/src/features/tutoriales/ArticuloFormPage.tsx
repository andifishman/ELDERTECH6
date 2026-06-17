// ========================================
// PANTALLA: ArticuloFormPage
// DESCRIPCIÓN:
// Alta/edición de tutorial o artículo educativo:
// contenido, categoría, nivel, multimedia y estado de
// publicación (publicar ahora / guardar borrador).
// ========================================
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/common/states';
import { cn } from '@/lib/utils';
import { notify } from '@/components/ui/toast';
import { useArticulo, useCategoriasArticulo, useGuardarArticulo } from './useArticulos';
import type { NivelArticulo, TipoArticulo } from '@/types/database.types';

interface Campos {
  titulo: string;
  descripcion: string;
  url_contenido: string;
  duracion_minutos: string;
  imagen_preview_url: string;
}

const NIVELES: { v: NivelArticulo; label: string; dot: string }[] = [
  { v: 'principiante', label: 'Principiante', dot: 'bg-primary' },
  { v: 'intermedio', label: 'Intermedio', dot: 'bg-amber-500' },
  { v: 'avanzado', label: 'Avanzado', dot: 'bg-red-500' },
];

export function ArticuloFormPage() {
  const { id } = useParams();
  const esEdicion = !!id;
  const navigate = useNavigate();

  const { data: categorias, isLoading: cargandoCat } = useCategoriasArticulo();
  const { data: articulo, isLoading: cargandoArt } = useArticulo(id);
  const guardar = useGuardarArticulo();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Campos>();
  const [categoriaId, setCategoriaId] = useState('');
  const [tipo, setTipo] = useState<TipoArticulo>('video');
  const [nivel, setNivel] = useState<NivelArticulo>('principiante');

  useEffect(() => {
    if (!articulo) return;
    reset({
      titulo: articulo.titulo,
      descripcion: articulo.descripcion ?? '',
      url_contenido: articulo.url_contenido ?? '',
      duracion_minutos: articulo.duracion_minutos ? String(articulo.duracion_minutos) : '',
      imagen_preview_url: articulo.imagen_preview_url ?? '',
    });
    setCategoriaId(articulo.categoria_id ?? '');
    setTipo(articulo.tipo);
    setNivel(articulo.nivel);
  }, [articulo, reset]);

  const enviar = (campos: Campos, publicar: boolean) => {
    const input = {
      titulo: campos.titulo,
      descripcion: campos.descripcion || null,
      categoria_id: categoriaId || null,
      tipo,
      nivel,
      url_contenido: campos.url_contenido || null,
      duracion_minutos: campos.duracion_minutos ? Number(campos.duracion_minutos) : null,
      imagen_preview_url: campos.imagen_preview_url || null,
      activo: publicar,
    };
    guardar.mutate({ id, input }, { onSuccess: () => navigate('/tutoriales') });
  };

  if (cargandoCat || (esEdicion && cargandoArt)) return <LoadingState mensaje="Cargando…" />;

  return (
    <form className="space-y-5 pb-10">
      <PageHeader titulo={esEdicion ? 'Editar contenido' : 'Nuevo contenido'} descripcion="Completá los datos del contenido educativo." />

      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">1 · Contenido</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" placeholder="Ej: Cómo usar WhatsApp paso a paso" {...register('titulo', { required: 'Ingresá un título' })} />
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
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoArticulo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="guia">Guía</SelectItem>
                  <SelectItem value="texto">Texto</SelectItem>
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
            <Textarea id="descripcion" placeholder="Describí el contenido de forma clara y simple…" {...register('descripcion')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">2 · Multimedia</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="imagen">Imagen (URL)</Label>
            <Input id="imagen" placeholder="https://…" {...register('imagen_preview_url')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">Video / Contenido (URL)</Label>
            <Input id="url" placeholder="https://youtube.com/…" {...register('url_contenido')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dur">Duración (min)</Label>
            <Input id="dur" type="number" min={0} placeholder="5" {...register('duracion_minutos')} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => navigate('/tutoriales')}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={guardar.isPending}
          onClick={handleSubmit((c) => enviar(c, false), () => notify.error('Revisá los campos'))}
        >
          Guardar borrador
        </Button>
        <Button
          type="button"
          disabled={guardar.isPending}
          onClick={handleSubmit((c) => enviar(c, true), () => notify.error('Revisá los campos'))}
        >
          <Save className="h-4 w-4" /> {guardar.isPending ? 'Guardando…' : 'Publicar ahora'}
        </Button>
      </div>
    </form>
  );
}
