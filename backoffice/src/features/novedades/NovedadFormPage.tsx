// ========================================
// PANTALLA: NovedadFormPage
// DESCRIPCIÓN:
// Crear o editar una novedad: título, texto, foto, categoría, a quién va,
// cuándo se publica (ahora o programada con fecha y hora), cuánto dura,
// fecha del evento, fijarla arriba y si se manda aviso al celular. Se puede
// guardar como borrador, duplicar una existente y ver una vista previa de
// cómo la ve el residente en la app.
// ========================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarClock, CalendarDays, FileEdit, ImagePlus, Pin, Save, Send, Trash2, X } from 'lucide-react';
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
import {
  CATEGORIAS_NOVEDAD,
  DURACIONES_NOVEDAD,
  categoriaDe,
  estadoDe,
  subirFotoNovedad,
  type CategoriaNovedad,
} from '@/services/novedadesService';
import { useEditarNovedad, useNovedadDetalle, usePublicarBorrador, usePublicarNovedad } from './useNovedades';

const LARGO_TITULO = 120;
const LARGO_TEXTO = 4000;

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → valor de <input type="datetime-local"> en hora local. */
function aInputFechaHora(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO → valor de <input type="date"> en hora local. */
function aInputFecha(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Valor de <input type="datetime-local"> → ISO (la hora que se escribió es la local del navegador). */
const aIso = (valorLocal: string): string => new Date(valorLocal).toISOString();

/** "2026-10-30" → fin de ese día, en hora local, como ISO. */
const finDelDiaIso = (fecha: string): string => new Date(`${fecha}T23:59:00`).toISOString();

const fechaLarga = (d: Date) => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
const fechaHoraLarga = (valorLocal: string) => {
  const d = new Date(valorLocal);
  return `${d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${pad(d.getHours())}:${pad(d.getMinutes())} hs`;
};

const claseChip = (activo: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition-colors ${activo ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`;

export function NovedadFormPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const duplicarDe = params.get('duplicar') ?? undefined;
  const editando = !!id;
  const navigate = useNavigate();
  const detalleQ = useNovedadDetalle(id ?? duplicarDe);
  const gruposQ = useGruposLista();
  const publicar = usePublicarNovedad();
  const editar = useEditarNovedad();
  const publicarBorrador = usePublicarBorrador();

  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [paraTodos, setParaTodos] = useState(true);
  const [grupoIds, setGrupoIds] = useState<string[]>([]);
  const [notificar, setNotificar] = useState(true);
  const [categoria, setCategoria] = useState<CategoriaNovedad>('general');
  const [fijada, setFijada] = useState(false);
  const [programar, setProgramar] = useState(false);
  const [programadaPara, setProgramadaPara] = useState('');
  const [duracionDias, setDuracionDias] = useState(30);
  const [fechaEvento, setFechaEvento] = useState('');
  const [visibleHasta, setVisibleHasta] = useState('');
  const inputFoto = useRef<HTMLInputElement>(null);

  const original = editando ? detalleQ.data : undefined;
  const estadoOriginal = original ? estadoDe(original) : null;
  const esBorrador = estadoOriginal === 'borrador';
  /** Al crear, al duplicar y al editar un borrador se elige cuándo sale; en una ya publicada ya salió. */
  const eligeCuando = !editando || esBorrador || estadoOriginal === 'programada';
  const eligeDuracion = !editando || esBorrador;

  // Al editar o duplicar se cargan los valores de la novedad una sola vez.
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
    setCategoria(n.categoria);
    setFijada(n.fijada);
    setFechaEvento(!duplicarDe ? aInputFechaHora(n.fecha_evento) : '');
    if (editando) {
      setVisibleHasta(aInputFecha(n.visible_hasta));
      if (estadoDe(n) === 'programada') {
        setProgramar(true);
        setProgramadaPara(aInputFechaHora(n.publicar_en));
      }
    }
  }, [detalleQ.data, editando, duplicarDe]);

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
  const faltaFechaProgramada = eligeCuando && programar && !programadaPara;
  const programadaEnElPasado = eligeCuando && programar && !!programadaPara && new Date(programadaPara).getTime() <= Date.now();
  const faltaFechaEvento = !fechaEvento;
  const textosListos = !!titulo.trim() && !!texto.trim() && !faltaFechaEvento && !subiendoFoto;
  const puedePublicar = textosListos && (editando || !faltaDestino) && !faltaFechaProgramada && !programadaEnElPasado && !faltaFechaEvento;
  const guardando = publicar.isPending || editar.isPending || publicarBorrador.isPending;

  const publicarEnIso = eligeCuando && programar && programadaPara ? aIso(programadaPara) : null;
  // Vacía al abrir el formulario: convertirla recién cuando hay valor (si no, new Date('') rompe la página).
  const fechaEventoIso = fechaEvento ? aIso(fechaEvento) : null;

  const volver = () => navigate('/novedades');

  /** Crear: publica (o programa) o guarda como borrador. */
  const crear = (borrador: boolean) => {
    publicar.mutate(
      {
        titulo: titulo.trim(),
        texto: texto.trim(),
        imagenUrl,
        grupoIds: paraTodos ? [] : grupoIds,
        notificar,
        categoria,
        fijada,
        publicarEn: borrador ? null : publicarEnIso,
        duracionDias,
        fechaEvento: fechaEventoIso,
        borrador,
      },
      { onSuccess: volver },
    );
  };

  /** Editar: guarda los cambios; si era un borrador y se pidió, lo publica después. */
  const guardarCambios = (publicarDespues: boolean) => {
    if (!id) return;
    editar.mutate(
      {
        id,
        input: {
          titulo: titulo.trim(),
          texto: texto.trim(),
          imagenUrl,
          categoria,
          fijada,
          fechaEvento: fechaEventoIso,
          ...(estadoOriginal === 'programada' && publicarEnIso ? { publicarEn: publicarEnIso } : {}),
          ...(!esBorrador && visibleHasta ? { visibleHasta: finDelDiaIso(visibleHasta) } : {}),
        },
      },
      {
        onSuccess: () => {
          if (publicarDespues) {
            publicarBorrador.mutate({ id, notificar, publicarEn: publicarEnIso, duracionDias }, { onSuccess: volver });
          } else {
            notify.success(esBorrador ? 'Borrador guardado' : 'Novedad actualizada');
            volver();
          }
        },
      },
    );
  };

  const cambiarDestinoNoPermitido = editando && !esBorrador;

  const grupos = gruposQ.data ?? [];
  const nombresGrupos = grupos.filter((g) => grupoIds.includes(g.id)).map((g) => g.nombre);

  const hastaTexto = useMemo(() => {
    const base = eligeCuando && programar && programadaPara ? new Date(programadaPara) : new Date();
    return fechaLarga(new Date(base.getTime() + duracionDias * 86_400_000));
  }, [eligeCuando, programar, programadaPara, duracionDias]);

  if (editando && detalleQ.isLoading) return <LoadingState mensaje="Cargando novedad…" />;
  if ((editando || duplicarDe) && detalleQ.isError) return <ErrorState onReintentar={() => void detalleQ.refetch()} />;

  const cat = categoriaDe(categoria);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        titulo={editando ? (esBorrador ? 'Editar borrador' : 'Editar novedad') : duplicarDe ? 'Duplicar novedad' : 'Nueva novedad'}
        descripcion={
          editando && !esBorrador
            ? 'Los cambios se ven enseguida en la app. No se manda un aviso nuevo (para eso usá "Reenviar aviso" en la lista).'
            : `Se va a ver en el botón "Novedades" de la app hasta el ${hastaTexto}.`
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS_NOVEDAD.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCategoria(c.id)} className={claseChip(categoria === c.id)}>
                      {c.emoji} {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
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
            <CardContent className="space-y-5 pt-6">
              {/* Cuándo sale */}
              {eligeCuando ? (
                <div className="space-y-2">
                  <Label>¿Cuándo se publica?</Label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setProgramar(false)} className={claseChip(!programar)}>Ahora</button>
                    <button type="button" onClick={() => setProgramar(true)} className={`${claseChip(programar)} inline-flex items-center gap-1.5`}>
                      <CalendarClock className="h-4 w-4" /> Programar fecha y hora
                    </button>
                  </div>
                  {programar && (
                    <div className="max-w-xs space-y-1">
                      <Input
                        type="datetime-local"
                        value={programadaPara}
                        min={aInputFechaHora(new Date().toISOString())}
                        onChange={(e) => setProgramadaPara(e.target.value)}
                        aria-label="Fecha y hora de publicación"
                      />
                      {programadaEnElPasado && <p className="text-sm text-destructive">Elegí una fecha y hora que todavía no pasó.</p>}
                      {programadaPara && !programadaEnElPasado && (
                        <p className="text-sm text-muted-foreground">Sale sola el {fechaHoraLarga(programadaPara)}. Hasta entonces los residentes no la ven.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Publicada el {fechaLarga(new Date(original!.publicar_en))}.</p>
              )}

              {/* Cuánto dura */}
              {eligeDuracion ? (
                <div className="space-y-2">
                  <Label>¿Cuánto tiempo se ve?</Label>
                  <div className="flex flex-wrap gap-2">
                    {DURACIONES_NOVEDAD.map((d) => (
                      <button key={d.dias} type="button" onClick={() => setDuracionDias(d.dias)} className={claseChip(duracionDias === d.dias)}>
                        {d.texto}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Después de ese tiempo deja de verse en la app sola.</p>
                </div>
              ) : (
                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="hasta">Se ve hasta el</Label>
                  <Input id="hasta" type="date" value={visibleHasta} onChange={(e) => setVisibleHasta(e.target.value)} />
                  <p className="text-sm text-muted-foreground">Podés estirar la fecha para que siga visible, o acortarla para sacarla antes.</p>
                </div>
              )}

              {/* Evento */}
              <div className="space-y-2">
                <div>
                  <Label htmlFor="fechaEvento" className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Fecha y hora del evento <span className="text-destructive">*</span></Label>
                  <p className="text-sm text-muted-foreground">Es obligatoria. Se muestra el día y la hora destacados en la tarjeta, y si es hoy lleva un cartel "¡HOY!".</p>
                </div>
                <div className="max-w-xs">
                  <Input id="fechaEvento" type="datetime-local" value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} aria-label="Fecha y hora del evento" />
                  {faltaFechaEvento && <p className="mt-1 text-sm text-destructive">Elegí el día y la hora del evento.</p>}
                </div>
              </div>

              {/* Fijar */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="fijada" className="flex items-center gap-1.5"><Pin className="h-4 w-4" /> Fijar arriba</Label>
                  <p className="text-sm text-muted-foreground">Aparece primero en la lista de los residentes, con la marca "Importante".</p>
                </div>
                <Switch id="fijada" checked={fijada} onCheckedChange={setFijada} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>¿Para quién es?</Label>
                {cambiarDestinoNoPermitido ? (
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
                        <button key={op.texto} type="button" onClick={() => setParaTodos(op.valor)} className={claseChip(paraTodos === op.valor)}>
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
                              <button key={g.id} type="button" onClick={() => setGrupoIds((prev) => (activo ? prev.filter((x) => x !== g.id) : [...prev, g.id]))} className={claseChip(activo)}>
                                {g.nombre} <span className={activo ? 'text-primary-foreground/80' : 'text-muted-foreground'}>· {g.cantidad_residentes}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                    {faltaDestino && !editando && <p className="text-sm text-destructive">Elegí al menos un grupo.</p>}
                  </>
                )}
              </div>

              {(!editando || esBorrador) && (
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <Label htmlFor="notificar">Mandar aviso al celular</Label>
                    <p className="text-sm text-muted-foreground">
                      {programar
                        ? 'El aviso sale a la misma hora que la novedad. Al tocarlo se abre Novedades.'
                        : 'Los residentes reciben una notificación con el título. Al tocarla se abre Novedades.'}
                    </p>
                  </div>
                  <Switch id="notificar" checked={notificar} onCheckedChange={setNotificar} />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button type="button" variant="outline" onClick={volver}>
              <X className="h-4 w-4" /> Cancelar
            </Button>
            {!editando && (
              <Button type="button" variant="outline" disabled={!textosListos || guardando} onClick={() => crear(true)} className="gap-1.5">
                <FileEdit className="h-4 w-4" /> Guardar borrador
              </Button>
            )}
            {editando && esBorrador && (
              <Button type="button" variant="outline" disabled={!textosListos || guardando} onClick={() => guardarCambios(false)} className="gap-1.5">
                <FileEdit className="h-4 w-4" /> Guardar borrador
              </Button>
            )}
            {editando && !esBorrador ? (
              <Button type="button" disabled={!puedePublicar || guardando} onClick={() => guardarCambios(false)} className="gap-1.5">
                <Save className="h-4 w-4" /> {guardando ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!puedePublicar || guardando}
                onClick={() => (editando ? guardarCambios(true) : crear(false))}
                className="gap-1.5"
              >
                {programar ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {guardando ? 'Guardando…' : programar ? 'Programar novedad' : 'Publicar novedad'}
              </Button>
            )}
          </div>
        </div>

        {/* Vista previa de cómo la ve el residente */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Así la ve el residente</p>
          <div className={`overflow-hidden rounded-2xl border-2 bg-card shadow-sm ${fijada ? 'border-amber-300' : 'border-primary'}`}>
            {imagenUrl && <img src={imagenUrl} alt="" className="aspect-video w-full object-cover" />}
            <div className="space-y-1.5 p-4">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">Nueva</span>
                {fijada && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">📌 Importante</span>}
                {categoria !== 'general' && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">{cat.emoji} {cat.nombre}</span>
                )}
              </div>
              <p className="text-xl font-bold leading-snug">{titulo.trim() || 'Título de la novedad'}</p>
              {fechaEvento && <p className="text-xl font-bold text-primary-700">🗓️ {fechaHoraLarga(fechaEvento)}</p>}
              <p className="line-clamp-2 text-base leading-relaxed text-foreground/80">{texto.trim() || 'Acá se va a ver el texto de la novedad.'}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
