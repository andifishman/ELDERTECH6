// ========================================
// PANTALLA: AlbumPage
// DESCRIPCIÓN:
// Un álbum de fotos para las familias: subir y borrar fotos, publicarlo o
// volverlo a borrador, y borrar comentarios que no correspondan. Las
// familias solo ven los álbumes publicados.
// ========================================
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, ImagePlus, MessageSquare, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/common/states';
import { useAuth } from '@/features/auth/AuthContext';
import type { ComentarioFoto } from '@/services/familiaService';
import { excedeTamano, fecha, fechaHora, MAX_ARCHIVO_MB } from './formato';
import { useActualizarAlbum, useAlbum, useEliminarAlbum, useEliminarComentario, useEliminarFoto, useSubirFotos } from './useFamilia';

const MAX_FOTOS = 20;

export function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { puede } = useAuth();
  const albumQ = useAlbum(id);
  const subir = useSubirFotos(id ?? '');
  const actualizar = useActualizarAlbum(id ?? '');
  const eliminarAlbum = useEliminarAlbum();
  const eliminarFoto = useEliminarFoto(id ?? '');
  const eliminarComentario = useEliminarComentario(id ?? '');
  const input = useRef<HTMLInputElement>(null);

  const [fotoABorrar, setFotoABorrar] = useState<string | null>(null);
  const [comentarioABorrar, setComentarioABorrar] = useState<ComentarioFoto | null>(null);
  const [borrarAlbum, setBorrarAlbum] = useState(false);

  if (albumQ.isLoading) return <LoadingState mensaje="Cargando álbum…" />;
  if (albumQ.isError || !albumQ.data) return <ErrorState mensaje={albumQ.error?.message ?? 'No se encontró el álbum.'} onReintentar={() => navigate('/familia/contenido?tab=fotos')} />;

  const { album, fotos, comentarios } = albumQ.data;
  const publicado = album.publicado_en !== null;
  const puedeEditar = puede('familia_contenido', 'editar');
  const puedeCrear = puede('familia_contenido', 'crear');

  const elegir = (lista: FileList | null) => {
    const archivos = Array.from(lista ?? []);
    if (input.current) input.current.value = '';
    if (archivos.length === 0) return;
    if (archivos.length > MAX_FOTOS) return notify.error(`Máximo ${MAX_FOTOS} fotos por vez`);
    const pesadas = archivos.filter(excedeTamano);
    if (pesadas.length > 0) return notify.error('Hay fotos muy pesadas', `Cada foto puede pesar hasta ${MAX_ARCHIVO_MB} MB: ${pesadas.map((p) => p.name).join(', ')}`);
    subir.mutate(archivos);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/familia/contenido?tab=fotos')}><ArrowLeft className="h-4 w-4" /> Volver</Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-2xl font-bold tracking-tight">{album.titulo}</h2>
            {publicado ? <Badge variant="success">Publicado</Badge> : <Badge variant="warning">Borrador</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{album.actividad ? `${album.actividad} · ` : ''}{fecha(album.fecha)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeEditar && (
            <Button variant={publicado ? 'outline' : 'default'} className="gap-1.5" disabled={actualizar.isPending || (!publicado && fotos.length === 0)} onClick={() => actualizar.mutate({ publicar: !publicado })}>
              {publicado ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar para las familias</>}
            </Button>
          )}
          {puede('familia_contenido', 'eliminar') && <Button variant="outline" className="gap-1.5 text-destructive" onClick={() => setBorrarAlbum(true)}><Trash2 className="h-4 w-4" /> Eliminar álbum</Button>}
        </div>
      </div>

      {!publicado && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {fotos.length === 0 ? 'Subí al menos una foto para poder publicarlo.' : 'Es un borrador: las familias todavía no ven estas fotos. Revisalas y publicalo cuando estés lista/o.'}
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Fotos ({fotos.length})</h3>
          {(puedeCrear || puedeEditar) && (
            <>
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => elegir(e.target.files)} />
              <Button className="gap-1.5" disabled={subir.isPending} onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" /> {subir.isPending ? 'Subiendo…' : 'Subir fotos'}</Button>
            </>
          )}
        </div>
        {fotos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Todavía no hay fotos en este álbum.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {fotos.map((f) => (
              <div key={f.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                {f.url ? <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No se pudo cargar</div>}
                {puede('familia_contenido', 'eliminar') && (
                  <Button variant="destructive" size="icon" className="absolute right-2 top-2 h-8 w-8 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" aria-label="Eliminar foto" onClick={() => setFotoABorrar(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare className="h-5 w-5" /> Comentarios ({comentarios.length})</h3>
        {comentarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie comentó todavía.</p>
        ) : (
          <div className="space-y-2">
            {comentarios.map((c) => (
              <Card key={c.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm"><strong>{c.autor}</strong> <span className="text-xs text-muted-foreground">· {fechaHora(c.created_at)}</span></p>
                  <p className="whitespace-pre-line break-words text-sm">{c.texto}</p>
                </div>
                {puede('familia_contenido', 'eliminar') && <Button variant="ghost" size="icon" aria-label="Eliminar comentario" onClick={() => setComentarioABorrar(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        abierto={!!fotoABorrar}
        onOpenChange={(v) => !v && setFotoABorrar(null)}
        titulo="¿Eliminar la foto?"
        descripcion="Se borra definitivamente, con sus reacciones y comentarios."
        textoConfirmar="Eliminar"
        cargando={eliminarFoto.isPending}
        onConfirmar={() => fotoABorrar && eliminarFoto.mutate(fotoABorrar, { onSuccess: () => setFotoABorrar(null) })}
      />
      <ConfirmDialog
        abierto={!!comentarioABorrar}
        onOpenChange={(v) => !v && setComentarioABorrar(null)}
        titulo="¿Eliminar el comentario?"
        descripcion={comentarioABorrar ? `Se borra el comentario de ${comentarioABorrar.autor}. Las familias dejan de verlo.` : ''}
        textoConfirmar="Eliminar"
        cargando={eliminarComentario.isPending}
        onConfirmar={() => comentarioABorrar && eliminarComentario.mutate(comentarioABorrar.id, { onSuccess: () => setComentarioABorrar(null) })}
      />
      <ConfirmDialog
        abierto={borrarAlbum}
        onOpenChange={setBorrarAlbum}
        titulo="¿Eliminar el álbum?"
        descripcion={`"${album.titulo}" se borra con todas sus fotos, reacciones y comentarios. No se puede deshacer.`}
        textoConfirmar="Eliminar álbum"
        cargando={eliminarAlbum.isPending}
        onConfirmar={() => id && eliminarAlbum.mutate(id, { onSuccess: () => navigate('/familia/contenido?tab=fotos') })}
      />
    </div>
  );
}
