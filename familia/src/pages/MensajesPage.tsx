import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, ChevronRight, MessageCircle, Send, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/auth/AuthContext';
import { Aviso, Boton, Cargando, ErrorCaja, Tarjeta, Titulo, Vacio, mensajeDeError } from '@/components/ui';
import { fechaRelativa, fechaHora, nombreCompleto } from '@/lib/format';
import { enviarMensaje, getHilos, getMensajes } from '@/services/familia';

const MAX_FOTO_MB = 5;

export function MensajesPage() {
  const q = useQuery({ queryKey: ['hilos'], queryFn: getHilos, refetchInterval: 30_000 });
  return (
    <div>
      <Titulo sub="Escribile a tu familiar. Lo recibe en su aplicación y te puede contestar.">Mensajes</Titulo>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data && (q.data.length === 0 ? (
        <Vacio icono={<MessageCircle className="h-10 w-10" />} titulo="No tenés residentes vinculados" texto="Consultale a la residencia para que te vincule con tu familiar." />
      ) : (
        <ul className="space-y-3">
          {q.data.map((h) => (
            <li key={h.vinculoId}>
              <Link to={`/mensajes/${h.residenteId}`} className="block">
                <Tarjeta className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-800" aria-hidden>{h.nombre[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold">{nombreCompleto(h)}</p>
                    <p className={clsx('truncate', h.sinLeer > 0 ? 'font-semibold text-ink' : 'text-soft')}>
                      {h.ultimoMensaje ? `${h.ultimoMensaje.autor === 'familiar' ? 'Vos: ' : ''}${h.ultimoMensaje.vistaPrevia}` : 'Todavía no hay mensajes. ¡Escribile!'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {h.ultimoMensaje && <span className="text-sm text-soft">{fechaRelativa(h.ultimoMensaje.creadoEn)}</span>}
                    {h.sinLeer > 0 && <span className="min-w-7 rounded-full bg-red-700 px-2 text-center text-sm font-bold text-white" aria-label={`${h.sinLeer} sin leer`}>{h.sinLeer}</span>}
                  </div>
                  <ChevronRight className="h-6 w-6 shrink-0 text-primary-600" aria-hidden />
                </Tarjeta>
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export function ChatPage() {
  const { residenteId } = useParams<{ residenteId: string }>();
  const qc = useQueryClient();
  const { me } = useAuth();
  const residente = me?.residentes.find((r) => r.id === residenteId);
  const fin = useRef<HTMLDivElement>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  // Las frases rápidas del Inicio llegan como ?texto=…: se precargan en el cuadro para revisarlas antes de enviar.
  const [params] = useSearchParams();
  const [texto, setTexto] = useState(() => (params.get('texto') ?? '').slice(0, 2000));
  const [foto, setFoto] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const q = useQuery({ queryKey: ['mensajes', residenteId], queryFn: () => getMensajes(residenteId!), enabled: !!residenteId, refetchInterval: 15_000 });
  const enviar = useMutation({
    mutationFn: () => enviarMensaje(residenteId!, texto.trim(), foto),
    onSuccess: () => {
      setTexto('');
      quitarFoto();
      void qc.invalidateQueries({ queryKey: ['mensajes', residenteId] });
      void qc.invalidateQueries({ queryKey: ['hilos'] });
    },
  });

  // Al abrir la conversación se marcan como leídos: se refresca el contador de la barra.
  useEffect(() => {
    if (q.isSuccess) void qc.invalidateQueries({ queryKey: ['hilos'] });
  }, [q.isSuccess, q.dataUpdatedAt, qc]);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end' });
  }, [q.data?.length]);

  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  function quitarFoto() {
    setFoto(null);
    setVista(null);
    if (inputFoto.current) inputFoto.current.value = '';
  }

  const elegirFoto = (archivo: File | undefined) => {
    setErrorFoto(null);
    if (!archivo) return;
    if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) return setErrorFoto('Elegí una foto en formato JPG, PNG o WebP.');
    if (archivo.size > MAX_FOTO_MB * 1024 * 1024) return setErrorFoto(`La foto pesa demasiado (máximo ${MAX_FOTO_MB} MB).`);
    setFoto(archivo);
    setVista(URL.createObjectURL(archivo));
  };

  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    if ((texto.trim() || foto) && !enviar.isPending) enviar.mutate();
  };

  if (!residente) return <ErrorCaja error={new Error('No encontramos esa conversación.')} />;

  return (
    <div className="flex min-h-[calc(100dvh-13rem)] flex-col">
      <Link to="/mensajes" className="mb-2 inline-flex min-h-12 items-center gap-2 font-semibold text-primary-700"><ArrowLeft className="h-5 w-5" aria-hidden /> Mensajes</Link>
      <h1 className="mb-3 text-2xl font-bold text-primary-800">{nombreCompleto(residente)}</h1>

      <div className="flex-1 space-y-3" role="log" aria-live="polite" aria-label="Conversación">
        {q.isLoading && <Cargando />}
        {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
        {q.data?.length === 0 && <p className="py-8 text-center text-soft">Todavía no hay mensajes. Escribí el primero.</p>}
        {q.data?.map((m) => (
          <div key={m.id} className={clsx('flex', m.autor === 'familiar' ? 'justify-end' : 'justify-start')}>
            <div className={clsx('max-w-[85%] rounded-2xl px-4 py-2.5', m.autor === 'familiar' ? 'rounded-br-md bg-primary-600 text-white' : 'rounded-bl-md border border-primary-100 bg-white')}>
              {m.imagenUrl && <img src={m.imagenUrl} alt="Foto enviada" className="mb-2 max-h-72 rounded-xl object-contain" loading="lazy" />}
              {m.contenido && <p className="whitespace-pre-line break-words">{m.contenido}</p>}
              <p className={clsx('mt-1 text-xs', m.autor === 'familiar' ? 'text-white/80' : 'text-soft')}>
                {fechaHora(m.creadoEn)}{m.autor === 'familiar' ? (m.leido ? ' · Leído' : ' · Enviado') : ''}
              </p>
            </div>
          </div>
        ))}
        <div ref={fin} />
      </div>

      <form onSubmit={alEnviar} className="sticky bottom-20 mt-4 space-y-2 rounded-2xl border-2 border-primary-100 bg-white p-3 shadow-lg">
        {vista && (
          <div className="relative inline-block">
            <img src={vista} alt="Foto para enviar" className="max-h-32 rounded-xl" />
            <button type="button" onClick={quitarFoto} aria-label="Quitar la foto" className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-700 text-white"><X className="h-5 w-5" aria-hidden /></button>
          </div>
        )}
        {errorFoto && <Aviso tipo="error">{errorFoto}</Aviso>}
        {enviar.isError && <Aviso tipo="error">{mensajeDeError(enviar.error)}</Aviso>}
        <label htmlFor="mensaje" className="sr-only">Escribí tu mensaje</label>
        <textarea id="mensaje" value={texto} rows={2} maxLength={2000} onChange={(e) => setTexto(e.target.value)} placeholder="Escribí tu mensaje…" className="w-full resize-none rounded-xl border-2 border-primary-200 px-4 py-3 text-base focus:border-primary-600" />
        <div className="flex items-center gap-2">
          <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="foto-mensaje" onChange={(e) => elegirFoto(e.target.files?.[0])} />
          <label htmlFor="foto-mensaje" className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-primary-600 px-4 font-semibold text-primary-700 focus-within:outline focus-within:outline-2"><Camera className="h-5 w-5" aria-hidden /> Foto</label>
          <Boton type="submit" className="flex-1" cargando={enviar.isPending} disabled={!texto.trim() && !foto}><Send className="h-5 w-5" aria-hidden /> Enviar</Boton>
        </div>
      </form>
    </div>
  );
}
