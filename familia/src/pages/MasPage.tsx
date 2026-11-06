import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ChevronRight, ExternalLink, FileText, Lightbulb, LogOut, MessageSquareText, Newspaper, Phone, ArrowLeft } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Aviso, Boton, Cargando, ErrorCaja, Etiqueta, Tarjeta, Titulo, Vacio, mensajeDeError, AreaTexto, Campo } from '@/components/ui';
import { fechaHora, fechaLarga } from '@/lib/format';
import { confirmarAviso, crearPropuesta, getAvisos, getDocumentos, getNoticias, getPropuestas, type Propuesta } from '@/services/familia';

function Volver() {
  return <Link to="/mas" className="mb-3 inline-flex min-h-12 items-center gap-2 font-semibold text-primary-700"><ArrowLeft className="h-5 w-5" aria-hidden /> Más</Link>;
}

export function MasPage() {
  const { me, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const avisosQ = useQuery({ queryKey: ['avisos'], queryFn: getAvisos });
  const sinLeer = (avisosQ.data ?? []).filter((a) => !a.leido).length;

  const items: Array<{ to: string; texto: string; ayuda: string; icono: ReactNode; insignia?: number }> = [
    { to: '/avisos', texto: 'Avisos', ayuda: 'Comunicados de la residencia', icono: <Bell className="h-7 w-7" aria-hidden />, insignia: sinLeer },
    { to: '/noticias', texto: 'Noticias', ayuda: 'Novedades de la residencia', icono: <Newspaper className="h-7 w-7" aria-hidden /> },
    { to: '/documentos', texto: 'Documentos', ayuda: 'Archivos generales para las familias', icono: <FileText className="h-7 w-7" aria-hidden /> },
    { to: '/consultas', texto: 'Consultas y reclamos', ayuda: 'Escribile al personal', icono: <MessageSquareText className="h-7 w-7" aria-hidden /> },
    { to: '/propuestas', texto: 'Proponer una actividad', ayuda: 'Sugerí o ofrecete a dar un taller', icono: <Lightbulb className="h-7 w-7" aria-hidden /> },
  ];

  return (
    <div>
      <Titulo>Más</Titulo>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="block">
              <Tarjeta className="flex items-center gap-4">
                <span className="text-primary-600">{i.icono}</span>
                <span className="min-w-0 flex-1"><span className="block text-lg font-bold">{i.texto}</span><span className="block text-soft">{i.ayuda}</span></span>
                {!!i.insignia && <span className="min-w-7 rounded-full bg-red-700 px-2 text-center text-sm font-bold text-white" aria-label={`${i.insignia} sin leer`}>{i.insignia}</span>}
                <ChevronRight className="h-6 w-6 text-primary-600" aria-hidden />
              </Tarjeta>
            </Link>
          </li>
        ))}
      </ul>

      {me?.institucion && (me.institucion.telefono || me.institucion.email) && (
        <Tarjeta className="mt-6">
          <h2 className="mb-1 text-lg font-bold">{me.institucion.nombre}</h2>
          {me.institucion.telefono && <a className="flex min-h-12 items-center gap-2 font-semibold text-primary-700 underline" href={`tel:${me.institucion.telefono.replace(/[^\d+]/g, '')}`}><Phone className="h-5 w-5" aria-hidden /> {me.institucion.telefono}</a>}
        </Tarjeta>
      )}

      <Tarjeta className="mt-6">
        <p className="font-semibold">{me?.familiar.nombre} {me?.familiar.apellido}</p>
        <p className="mb-3 text-soft">{me?.familiar.email}</p>
        <Boton variante="secundario" bloque onClick={() => void cerrarSesion().then(() => navigate('/', { replace: true }))}><LogOut className="h-5 w-5" aria-hidden /> Cerrar sesión</Boton>
      </Tarjeta>
    </div>
  );
}

export function AvisosPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['avisos'], queryFn: getAvisos });
  const confirmar = useMutation({
    mutationFn: confirmarAviso,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['avisos'] });
      void qc.invalidateQueries({ queryKey: ['inicio'] });
    },
  });
  return (
    <div>
      <Volver />
      <Titulo sub="Confirmá que leíste cada aviso: la residencia sabe quién lo vio.">Avisos</Titulo>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {confirmar.isError && <div className="mb-3"><Aviso tipo="error">{mensajeDeError(confirmar.error)}</Aviso></div>}
      {q.data?.length === 0 && <Vacio icono={<Bell className="h-10 w-10" />} titulo="No hay avisos" />}
      <ul className="space-y-3">
        {q.data?.map((a) => (
          <li key={a.id}>
            <Tarjeta className={a.leido ? '' : 'border-2 border-primary-600'}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {a.importante && <Etiqueta color="rojo">Importante</Etiqueta>}
                {a.leido ? <Etiqueta color="verde">Leído</Etiqueta> : <Etiqueta color="ambar">Sin leer</Etiqueta>}
                <span className="text-sm text-soft">{fechaHora(a.publicar_en)}</span>
              </div>
              <h2 className="text-lg font-bold">{a.titulo}</h2>
              <p className="mt-1 whitespace-pre-line break-words">{a.texto}</p>
              {!a.leido && <Boton className="mt-3" bloque cargando={confirmar.isPending && confirmar.variables === a.id} onClick={() => confirmar.mutate(a.id)}>Ya lo leí</Boton>}
            </Tarjeta>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NoticiasPage() {
  const q = useQuery({ queryKey: ['noticias'], queryFn: getNoticias });
  return (
    <div>
      <Volver />
      <Titulo>Noticias</Titulo>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data?.length === 0 && <Vacio icono={<Newspaper className="h-10 w-10" />} titulo="No hay noticias por ahora" />}
      <ul className="space-y-4">
        {q.data?.map((n) => (
          <li key={n.id}>
            <Tarjeta className="overflow-hidden p-0">
              {n.imagen_url && <img src={n.imagen_url} alt="" className="max-h-64 w-full object-cover" loading="lazy" />}
              <div className="p-4">
                {n.fecha_evento && <p className="font-semibold capitalize text-primary-700">{fechaLarga(n.fecha_evento)}</p>}
                <h2 className="text-lg font-bold">{n.titulo}</h2>
                <p className="mt-1 whitespace-pre-line break-words">{n.texto}</p>
              </div>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DocumentosPage() {
  const q = useQuery({ queryKey: ['documentos'], queryFn: getDocumentos });
  return (
    <div>
      <Volver />
      <Titulo sub="Información general de la residencia.">Documentos</Titulo>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data?.length === 0 && <Vacio icono={<FileText className="h-10 w-10" />} titulo="No hay documentos" />}
      <ul className="space-y-3">
        {q.data?.map((d) => (
          <li key={d.id}>
            <Tarjeta>
              <h2 className="text-lg font-bold">{d.titulo}</h2>
              {d.descripcion && <p className="text-soft">{d.descripcion}</p>}
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary-600 px-5 font-semibold text-white"><ExternalLink className="h-5 w-5" aria-hidden /> Abrir {d.mime === 'application/pdf' ? 'el PDF' : 'la imagen'}</a>
              ) : (
                <p className="mt-2 text-red-900">No pudimos abrir este archivo ahora. Probá de nuevo más tarde.</p>
              )}
            </Tarjeta>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ESTADOS_PROPUESTA: Record<Propuesta['estado'], { texto: string; color: 'ambar' | 'violeta' | 'verde' | 'gris' }> = {
  pendiente: { texto: 'Recibida', color: 'ambar' },
  en_revision: { texto: 'En revisión', color: 'violeta' },
  aceptada: { texto: 'Aceptada', color: 'verde' },
  no_posible: { texto: 'No es posible por ahora', color: 'gris' },
};

export function PropuestasPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['propuestas'], queryFn: getPropuestas });
  const [tipo, setTipo] = useState<'proponer' | 'ofrecerse'>('proponer');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const enviar = useMutation({
    mutationFn: () => crearPropuesta({ tipo, titulo: titulo.trim(), descripcion: descripcion.trim() }),
    onSuccess: () => {
      setTitulo('');
      setDescripcion('');
      void qc.invalidateQueries({ queryKey: ['propuestas'] });
    },
  });

  return (
    <div>
      <Volver />
      <Titulo sub="Contale a la residencia qué actividad o taller te gustaría, o ofrecete a darlo vos.">Proponer una actividad</Titulo>
      <Tarjeta>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (titulo.trim() && descripcion.trim()) enviar.mutate(); }}>
          <fieldset className="space-y-2">
            <legend className="mb-1 font-semibold">¿Qué querés hacer?</legend>
            {([['proponer', 'Sugerir una actividad'], ['ofrecerse', 'Ofrecerme a darla yo']] as const).map(([valor, texto]) => (
              <label key={valor} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-primary-200 px-4 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50">
                <input type="radio" name="tipo" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} className="h-5 w-5 accent-primary-600" /> <span className="font-semibold">{texto}</span>
              </label>
            ))}
          </fieldset>
          <Campo etiqueta="Nombre de la actividad" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Taller de pintura" />
          <AreaTexto etiqueta="Contanos más" value={descripcion} maxLength={2000} onChange={(e) => setDescripcion(e.target.value)} placeholder="Qué se haría, cuánto dura, qué hace falta…" />
          {enviar.isError && <Aviso tipo="error">{mensajeDeError(enviar.error)}</Aviso>}
          {enviar.isSuccess && <Aviso tipo="exito">¡Gracias! Recibimos tu propuesta. El personal la va a revisar.</Aviso>}
          <Boton type="submit" bloque cargando={enviar.isPending} disabled={!titulo.trim() || !descripcion.trim()}>Enviar propuesta</Boton>
        </form>
      </Tarjeta>

      <h2 className="mb-2 mt-6 text-lg font-bold text-primary-800">Tus propuestas</h2>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data?.length === 0 && <p className="text-soft">Todavía no mandaste ninguna.</p>}
      <ul className="space-y-3">
        {q.data?.map((p) => (
          <li key={p.id}>
            <Tarjeta>
              <div className="mb-1 flex flex-wrap items-center gap-2"><Etiqueta color={ESTADOS_PROPUESTA[p.estado].color}>{ESTADOS_PROPUESTA[p.estado].texto}</Etiqueta><span className="text-sm text-soft">{fechaHora(p.created_at)}</span></div>
              <h3 className="text-lg font-bold">{p.titulo}</h3>
              <p className="whitespace-pre-line break-words text-soft">{p.descripcion}</p>
              {p.respuesta && <p className="mt-2 rounded-xl bg-primary-50 p-3"><strong>Respuesta de la residencia:</strong> {p.respuesta}</p>}
            </Tarjeta>
          </li>
        ))}
      </ul>
    </div>
  );
}
