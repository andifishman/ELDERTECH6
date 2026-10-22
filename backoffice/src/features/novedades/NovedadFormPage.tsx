// ========================================
// PANTALLA: NovedadFormPage
// DESCRIPCIÓN:
// Publicar una novedad (título, texto, foto opcional, a quién va y si
// se manda aviso al celular) o editar una ya publicada. Al editar solo
// se cambian título, texto y foto: el destino y el aviso ya se usaron
// al publicarla.
// ========================================
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Send, Save, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingState, ErrorState } from '@/components/common/states';
import { notify } from '@/components/ui/toast';
import { useGruposLista } from '@/features/grupos/useGrupos';
import { subirFotoNovedad } from '@/services/novedadesService';
import { useEditarNovedad, useNovedadDetalle, usePublicarNovedad } from './useNovedades';

const LARGO_TITULO = 120;
const LARGO_TEXTO = 4000;

function fechaEnUnMes(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

export function NovedadFormPage() {
  const { id } = useParams<{ id: string }>();
  const editando = !!id;
  const navigate = useNavigate();
  const detalleQ = useNovedadDetalle(id);
  const gruposQ = useGruposLista();
  const publicar = usePublicarNovedad();
  const editar = useEditarNovedad();

  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [paraTodos, setParaTodos] = useState(true);
  const [grupoIds, setGrupoIds] = useState<string[]>([]);
  const [notificar, setNotificar] = useState(true);
  const inputFoto = useRef<HTMLInputElement>(null);

  // Al editar, se cargan los valores actuales una sola vez.
  const cargada = useRef(false);
  useEffect(() => {
    const n = detalleQ.data;
    if (!n || cargada.current) return;
    cargada.current = true;
    setTitulo(n.titulo);
    setTexto(n.texto);
    setImagenUrl(n.imagen_url);
    setParaTodos(!n.grupo_ids);
    setGrupoIds(n.grupo_ids ?? []);
  }, [detalleQ.data]);

  const elegirFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendoFoto(true);
    try {
      setImagenUrl(await subirFotoNovedad(archivo));
    } catch (err) {
      notify.error('No se pudo subir la foto', err instanceof Error ? err.message : undefined);
    } finally {
      setSubiendoFoto(false);
      if (inputFoto.current) inputFoto.current.value = '';
    }
  };

  const faltaDestino = !paraTodos && grupoIds.length === 0;
  const puedeGuardar = !!titulo.trim() && !!texto.trim() && !subiendoFoto && (editando || !faltaDestino);
  const guardando = publicar.isPending || editar.isPending;

  const guardar = () => {
    if (!puedeGuardar) return;
    if (editando && id) {
      editar.mutate(
        { id, input: { titulo: titulo.trim(), texto: texto.trim(), imagenUrl } },
        { onSuccess: () => navigate('/novedades') },
      );
      return;
    }
    publicar.mutate(
      { titulo: titulo.trim(), texto: texto.trim(), imagenUrl, grupoIds: paraTodos ? [] : grupoIds, notificar },
      { onSuccess: () => navigate('/novedades') },
    );
  };

  if (editando && detalleQ.isLoading) return <LoadingState mensaje="Cargando novedad…" />;
  if (editando && detalleQ.isError) return <ErrorState onReintentar={() => void detalleQ.refetch()} />;

  const grupos = gruposQ.data ?? [];
  const nombresGrupos = grupos.filter((g) => grupoIds.includes(g.id)).map((g) => g.nombre);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        titulo={editando ? 'Editar novedad' : 'Nueva novedad'}
        descripcion={
          editando
            ? 'Los cambios se ven enseguida en la app. No se manda un aviso nuevo.'
            : `Se va a ver en el botón "Novedades" de la app hasta el ${fechaEnUnMes()}.`
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Llega la fiesta de la primavera" maxLength={LARGO_TITULO} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="texto">Texto</Label>
              <span className="text-xs tabular-nums text-muted-foreground">{texto.length}/{LARGO_TEXTO}</span>
            </div>
            <Textarea
              id="texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={7}
              maxLength={LARGO_TEXTO}
              placeholder="Contá la novedad con palabras simples. Ej: El sábado 21 a las 16 hs festejamos en el salón comedor, con música en vivo y merienda."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Foto (opcional)</Label>
            {imagenUrl ? (
              <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-border">
                <img src={imagenUrl} alt="Foto de la novedad" className="aspect-video w-full object-cover" />
                <Button type="button" variant="outline" size="sm" className="absolute right-2 top-2 gap-1.5 bg-background/90" onClick={() => setImagenUrl(null)}>
                  <Trash2 className="h-4 w-4" /> Quitar
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="gap-1.5" disabled={subiendoFoto} onClick={() => inputFoto.current?.click()}>
                <ImagePlus className="h-4 w-4" /> {subiendoFoto ? 'Subiendo foto…' : 'Agregar foto'}
              </Button>
            )}
            <input
              ref={inputFoto}
              id="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void elegirFoto(e.target.files?.[0])}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>¿Para quién es?</Label>
            {editando ? (
              <p className="text-sm text-muted-foreground">
                {paraTodos ? 'Para todos los residentes.' : `Para los grupos: ${nombresGrupos.join(', ') || '—'}.`} El destino no se puede cambiar después de publicar.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {[
                    { valor: true, texto: 'Todos los residentes' },
                    { valor: false, texto: 'Solo algunos grupos' },
                  ].map((op) => (
                    <button
                      key={op.texto}
                      type="button"
                      onClick={() => setParaTodos(op.valor)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${paraTodos === op.valor ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
                    >
                      {op.texto}
                    </button>
                  ))}
                </div>
                {!paraTodos && (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-border p-3">
                    {gruposQ.isLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando grupos…</p>
                    ) : grupos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Todavía no hay grupos creados. Creá uno desde la sección Grupos.</p>
                    ) : (
                      grupos.map((g) => {
                        const activo = grupoIds.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGrupoIds((prev) => (activo ? prev.filter((x) => x !== g.id) : [...prev, g.id]))}
                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${activo ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
                          >
                            {g.nombre} <span className={activo ? 'text-primary-foreground/80' : 'text-muted-foreground'}>· {g.cantidad_residentes}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
                {faltaDestino && <p className="text-sm text-destructive">Elegí al menos un grupo.</p>}
              </>
            )}
          </div>

          {!editando && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="notificar">Mandar aviso al celular</Label>
                <p className="text-sm text-muted-foreground">Los residentes reciben una notificación con el título. Al tocarla se abre Novedades.</p>
              </div>
              <Switch id="notificar" checked={notificar} onCheckedChange={setNotificar} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => navigate('/novedades')}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
        <Button type="button" disabled={!puedeGuardar || guardando} onClick={guardar} className="gap-1.5">
          {editando ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Publicar novedad'}
        </Button>
      </div>
    </div>
  );
}
