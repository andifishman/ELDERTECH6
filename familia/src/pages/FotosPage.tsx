import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, Heart, Hand, ThumbsUp, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Aviso, Boton, Cargando, ErrorCaja, Tarjeta, Titulo, Vacio, mensajeDeError } from '@/components/ui';
import { fechaCorta, fechaHora } from '@/lib/format';
import { borrarComentario, comentar, getAlbum, getAlbumes, getComentarios, reaccionar, type Foto, type TipoReaccion } from '@/services/familia';

const REACCIONES: Array<{ tipo: TipoReaccion; texto: string; icono: typeof Heart }> = [
  { tipo: 'corazon', texto: 'Me encanta', icono: Heart },
  { tipo: 'me_gusta', texto: 'Me gusta', icono: ThumbsUp },
  { tipo: 'abrazo', texto: 'Un abrazo', icono: Hand },
];

export function FotosPage() {
  const q = useQuery({ queryKey: ['albumes'], queryFn: getAlbumes });
  return (
    <div>
      <Titulo sub="Fotos de las actividades que publica la residencia.">Fotos</Titulo>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data && (q.data.length === 0 ? (
        <Vacio icono={<Camera className="h-10 w-10" />} titulo="Todavía no hay fotos" texto="Cuando la residencia publique fotos de las actividades, las vas a ver acá." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {q.data.map((a) => (
            <li key={a.id}>
              <Link to={`/fotos/${a.id}`} className="block overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-sm">
                <div className="aspect-[4/3] bg-primary-50">
                  {a.portada_url ? <img src={a.portada_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-primary-600"><Camera className="h-10 w-10" aria-hidden /></div>}
                </div>
                <div className="p-3">
                  <p className="text-lg font-bold">{a.titulo}</p>
                  <p className="text-soft">{a.actividad ? `${a.actividad} · ` : ''}{fechaCorta(`${a.fecha}T12:00:00Z`)} · {a.cantidad_fotos} {a.cantidad_fotos === 1 ? 'foto' : 'fotos'}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function Comentarios({ fotoId }: { fotoId: string }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');
  const q = useQuery({ queryKey: ['comentarios', fotoId], queryFn: () => getComentarios(fotoId) });
  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['comentarios', fotoId] });
    void qc.invalidateQueries({ queryKey: ['album'] });
  };
  const enviar = useMutation({ mutationFn: () => comentar(fotoId, texto.trim()), onSuccess: () => { setTexto(''); refrescar(); } });
  const borrar = useMutation({ mutationFn: borrarComentario, onSuccess: refrescar });

  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    if (texto.trim()) enviar.mutate();
  };

  return (
    <section aria-label="Comentarios" className="mt-4 space-y-3">
      <h3 className="text-lg font-bold text-primary-800">Comentarios</h3>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data?.length === 0 && <p className="text-soft">Todavía no hay comentarios. ¡Escribí el primero!</p>}
      <ul className="space-y-2">
        {q.data?.map((c) => (
          <li key={c.id} className="rounded-xl bg-primary-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm"><strong>{c.autor}</strong> <span className="text-soft">· {fechaHora(c.created_at)}</span></p>
              {c.mio && <button type="button" aria-label="Borrar mi comentario" className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-red-800 hover:bg-red-50" disabled={borrar.isPending} onClick={() => borrar.mutate(c.id)}><Trash2 className="h-5 w-5" aria-hidden /></button>}
            </div>
            <p className="whitespace-pre-line break-words">{c.texto}</p>
          </li>
        ))}
      </ul>
      {(enviar.isError || borrar.isError) && <Aviso tipo="error">{mensajeDeError(enviar.error ?? borrar.error)}</Aviso>}
      <form onSubmit={alEnviar} className="space-y-2">
        <label htmlFor={`comentario-${fotoId}`} className="block font-semibold">Escribí un comentario</label>
        <textarea id={`comentario-${fotoId}`} value={texto} maxLength={500} rows={2} onChange={(e) => setTexto(e.target.value)} className="w-full rounded-xl border-2 border-primary-200 bg-white px-4 py-3 text-base focus:border-primary-600" />
        <Boton type="submit" cargando={enviar.isPending} disabled={!texto.trim()}>Comentar</Boton>
      </form>
    </section>
  );
}

function BarraReacciones({ foto }: { foto: Foto }) {
  const qc = useQueryClient();
  const mutar = useMutation({ mutationFn: (tipo: TipoReaccion | null) => reaccionar(foto.id, tipo), onSuccess: () => void qc.invalidateQueries({ queryKey: ['album'] }) });
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Reaccionar a esta foto">
      {REACCIONES.map(({ tipo, texto, icono: Icono }) => {
        const activo = foto.mi_reaccion === tipo;
        return (
          <button
            key={tipo}
            type="button"
            aria-pressed={activo}
            disabled={mutar.isPending}
            onClick={() => mutar.mutate(activo ? null : tipo)}
            className={clsx('flex min-h-12 items-center gap-2 rounded-xl border-2 px-4 font-semibold', activo ? 'border-primary-600 bg-primary-600 text-white' : 'border-primary-200 bg-white text-ink')}
          >
            <Icono className="h-5 w-5" aria-hidden /> {texto} <span className="rounded-full bg-black/10 px-2 text-sm">{foto.reacciones[tipo]}</span>
          </button>
        );
      })}
      {mutar.isError && <Aviso tipo="error">{mensajeDeError(mutar.error)}</Aviso>}
    </div>
  );
}

export function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ['album', id], queryFn: () => getAlbum(id!), enabled: !!id });
  const pista = useRef<HTMLUListElement>(null);
  const [indice, setIndice] = useState(0);

  const fotos = q.data?.fotos ?? [];
  const foto = fotos[indice];

  // Al deslizar con el dedo, el índice sigue a la foto que quedó a la vista.
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    const alScroll = () => setIndice(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener('scroll', alScroll, { passive: true });
    return () => el.removeEventListener('scroll', alScroll);
  }, [fotos.length]);

  const ir = (i: number) => {
    const el = pista.current;
    if (!el) return;
    const destino = Math.max(0, Math.min(fotos.length - 1, i));
    el.scrollTo({ left: destino * el.clientWidth, behavior: 'smooth' });
    setIndice(destino);
  };

  if (q.isLoading) return <Cargando />;
  if (q.isError || !q.data) return <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />;

  return (
    <div>
      <Link to="/fotos" className="mb-3 inline-flex min-h-12 items-center gap-2 font-semibold text-primary-700"><ArrowLeft className="h-5 w-5" aria-hidden /> Todos los álbumes</Link>
      <Titulo sub={`${q.data.album.actividad ? `${q.data.album.actividad} · ` : ''}${fechaCorta(`${q.data.album.fecha}T12:00:00Z`)}`}>{q.data.album.titulo}</Titulo>

      <div className="relative">
        <ul ref={pista} className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-black [scrollbar-width:none]" aria-roledescription="carrusel" aria-label="Fotos del álbum">
          {fotos.map((f, i) => (
            <li key={f.id} className="aspect-[4/3] w-full shrink-0 snap-center" aria-label={`Foto ${i + 1} de ${fotos.length}`}>
              {f.url ? <img src={f.url} alt={`Foto ${i + 1} de ${fotos.length} del álbum ${q.data.album.titulo}`} className="h-full w-full object-contain" loading={i === 0 ? 'eager' : 'lazy'} /> : <div className="flex h-full items-center justify-center text-white">No se pudo cargar la foto</div>}
            </li>
          ))}
        </ul>
        {fotos.length > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" disabled={indice === 0} onClick={() => ir(indice - 1)} className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary-800 shadow disabled:opacity-30"><ChevronLeft className="h-7 w-7" aria-hidden /></button>
            <button type="button" aria-label="Foto siguiente" disabled={indice === fotos.length - 1} onClick={() => ir(indice + 1)} className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary-800 shadow disabled:opacity-30"><ChevronRight className="h-7 w-7" aria-hidden /></button>
          </>
        )}
      </div>
      <p className="mt-2 text-center font-semibold text-soft" aria-live="polite">Foto {Math.min(indice + 1, fotos.length)} de {fotos.length}</p>

      {foto && (
        <Tarjeta className="mt-3">
          <BarraReacciones key={foto.id} foto={foto} />
          <Comentarios key={`c-${foto.id}`} fotoId={foto.id} />
        </Tarjeta>
      )}
    </div>
  );
}
