import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, MessageSquareText, Plus } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/auth/AuthContext';
import { Aviso, AreaTexto, Boton, Campo, Cargando, ErrorCaja, Etiqueta, Tarjeta, Titulo, Vacio, mensajeDeError } from '@/components/ui';
import { fechaHora, nombreCompleto } from '@/lib/format';
import { crearCaso, getCaso, getCasos, getCategorias, responderCaso, type EstadoCaso, type TipoCaso } from '@/services/familia';

const TIPOS: Record<TipoCaso, { texto: string; ayuda: string }> = {
  consulta: { texto: 'Consulta', ayuda: 'Una pregunta o un pedido para el personal' },
  sugerencia: { texto: 'Sugerencia', ayuda: 'Una idea para mejorar algo' },
  reclamo: { texto: 'Reclamo', ayuda: 'Algo que no está bien y querés que se revise' },
};

const ESTADOS: Record<EstadoCaso, { texto: string; color: 'ambar' | 'violeta' | 'verde' }> = {
  pendiente: { texto: 'Recibida', color: 'ambar' },
  en_proceso: { texto: 'En proceso', color: 'violeta' },
  resuelta: { texto: 'Resuelta', color: 'verde' },
};

export function ConsultasPage() {
  const q = useQuery({ queryKey: ['casos'], queryFn: getCasos });
  return (
    <div>
      <Link to="/mas" className="mb-3 inline-flex min-h-12 items-center gap-2 font-semibold text-primary-700"><ArrowLeft className="h-5 w-5" aria-hidden /> Más</Link>
      <Titulo sub="Escribile al personal y seguí el estado de cada consulta.">Consultas y reclamos</Titulo>
      <Link to="/consultas/nueva" className="mb-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-base font-semibold text-white"><Plus className="h-5 w-5" aria-hidden /> Escribir al personal</Link>
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data?.length === 0 && <Vacio icono={<MessageSquareText className="h-10 w-10" />} titulo="Todavía no escribiste ninguna consulta" />}
      <ul className="space-y-3">
        {q.data?.map((c) => (
          <li key={c.id}>
            <Link to={`/consultas/${c.id}`} className="block">
              <Tarjeta className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><Etiqueta color={ESTADOS[c.estado].color}>{ESTADOS[c.estado].texto}</Etiqueta><Etiqueta color="gris">{TIPOS[c.tipo].texto}</Etiqueta></div>
                  <p className="truncate text-lg font-bold">{c.asunto}</p>
                  <p className="text-sm text-soft">{fechaHora(c.created_at)}{c.cantidad_respuestas > 0 ? ` · ${c.cantidad_respuestas} ${c.cantidad_respuestas === 1 ? 'mensaje' : 'mensajes'}` : ''}</p>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0 text-primary-600" aria-hidden />
              </Tarjeta>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NuevaConsultaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { me, residente } = useAuth();
  const categoriasQ = useQuery({ queryKey: ['categorias'], queryFn: getCategorias });
  const [tipo, setTipo] = useState<TipoCaso>('consulta');
  const [categoriaId, setCategoriaId] = useState('');
  const [residenteId, setResidenteId] = useState(residente?.id ?? '');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const enviar = useMutation({
    mutationFn: () => crearCaso({ tipo, categoriaId: tipo === 'consulta' ? categoriaId : null, residenteId: residenteId || null, asunto: asunto.trim(), descripcion: descripcion.trim() }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['casos'] });
      navigate(`/consultas/${r.id}`, { replace: true });
    },
  });

  const listo = asunto.trim() && descripcion.trim() && (tipo !== 'consulta' || categoriaId);

  return (
    <div>
      <Link to="/consultas" className="mb-3 inline-flex min-h-12 items-center gap-2 font-semibold text-primary-700"><ArrowLeft className="h-5 w-5" aria-hidden /> Consultas</Link>
      <Titulo>Escribir al personal</Titulo>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (listo && !enviar.isPending) enviar.mutate(); }}>
        <fieldset className="space-y-2">
          <legend className="mb-1 font-semibold">¿Qué querés hacer?</legend>
          {(Object.keys(TIPOS) as TipoCaso[]).map((t) => (
            <label key={t} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-primary-200 bg-white px-4 py-2 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50">
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="h-5 w-5 accent-primary-600" />
              <span><span className="block font-semibold">{TIPOS[t].texto}</span><span className="block text-sm text-soft">{TIPOS[t].ayuda}</span></span>
            </label>
          ))}
        </fieldset>

        {tipo === 'consulta' && (
          <div className="space-y-1.5">
            <label htmlFor="categoria" className="block font-semibold">Categoría</label>
            <select id="categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-primary-200 bg-white px-3 text-base">
              <option value="">Elegí una categoría…</option>
              {categoriasQ.data?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {categoriasQ.isError && <Aviso tipo="error">No pudimos cargar las categorías. Probá de nuevo.</Aviso>}
          </div>
        )}

        {me && me.residentes.length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="residente" className="block font-semibold">¿Es sobre algún familiar?</label>
            <select id="residente" value={residenteId} onChange={(e) => setResidenteId(e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-primary-200 bg-white px-3 text-base">
              <option value="">No, es general</option>
              {me.residentes.map((r) => <option key={r.id} value={r.id}>{nombreCompleto(r)}</option>)}
            </select>
          </div>
        )}

        <Campo etiqueta="Asunto" value={asunto} maxLength={120} onChange={(e) => setAsunto(e.target.value)} />
        <AreaTexto etiqueta="Contanos" value={descripcion} maxLength={4000} onChange={(e) => setDescripcion(e.target.value)} rows={6} />
        <Aviso>Por favor no escribas acá datos de salud ni urgencias. Para algo urgente, llamá a la residencia por teléfono.</Aviso>
        {enviar.isError && <Aviso tipo="error">{mensajeDeError(enviar.error)}</Aviso>}
        <Boton type="submit" bloque cargando={enviar.isPending} disabled={!listo}>Enviar</Boton>
      </form>
    </div>
  );
}

export function ConsultaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['caso', id], queryFn: () => getCaso(id!), enabled: !!id, refetchInterval: 30_000 });
  const [texto, setTexto] = useState('');
  const responder = useMutation({
    mutationFn: () => responderCaso(id!, texto.trim()),
    onSuccess: () => {
      setTexto('');
      void qc.invalidateQueries({ queryKey: ['caso', id] });
      void qc.invalidateQueries({ queryKey: ['casos'] });
    },
  });

  if (q.isLoading) return <Cargando />;
  if (q.isError || !q.data) return <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />;
  const { caso, mensajes } = q.data;

  return (
    <div>
      <Link to="/consultas" className="mb-3 inline-flex min-h-12 items-center gap-2 font-semibold text-primary-700"><ArrowLeft className="h-5 w-5" aria-hidden /> Consultas</Link>
      <div className="mb-3 flex flex-wrap items-center gap-2"><Etiqueta color={ESTADOS[caso.estado].color}>{ESTADOS[caso.estado].texto}</Etiqueta><Etiqueta color="gris">{TIPOS[caso.tipo].texto}</Etiqueta>{caso.categoria_nombre && <Etiqueta>{caso.categoria_nombre}</Etiqueta>}</div>
      <h1 className="text-2xl font-bold text-primary-800">{caso.asunto}</h1>
      {caso.residente_nombre && <p className="text-soft">Sobre {caso.residente_nombre}</p>}

      <div className="mt-4 space-y-3">
        <div className="rounded-2xl rounded-br-md bg-primary-600 p-4 text-white"><p className="whitespace-pre-line break-words">{caso.descripcion}</p><p className="mt-1 text-xs text-white/80">Vos · {fechaHora(caso.created_at)}</p></div>
        {mensajes.map((m) => (
          <div key={m.id} className={clsx('rounded-2xl p-4', m.autor === 'personal' ? 'rounded-bl-md border border-primary-100 bg-white' : 'rounded-br-md bg-primary-600 text-white')}>
            <p className="whitespace-pre-line break-words">{m.texto}</p>
            <p className={clsx('mt-1 text-xs', m.autor === 'personal' ? 'text-soft' : 'text-white/80')}>{m.autor === 'personal' ? 'Personal de la residencia' : 'Vos'} · {fechaHora(m.created_at)}</p>
          </div>
        ))}
        {mensajes.length === 0 && caso.estado === 'pendiente' && <p className="text-soft">Recibimos tu mensaje. El personal te va a responder por acá.</p>}
      </div>

      <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); if (texto.trim() && !responder.isPending) responder.mutate(); }}>
        <AreaTexto etiqueta={caso.estado === 'resuelta' ? 'Escribir de nuevo (se reabre la consulta)' : 'Agregar un mensaje'} value={texto} maxLength={4000} rows={3} onChange={(e) => setTexto(e.target.value)} />
        {responder.isError && <Aviso tipo="error">{mensajeDeError(responder.error)}</Aviso>}
        <Boton type="submit" bloque cargando={responder.isPending} disabled={!texto.trim()}>Enviar mensaje</Boton>
      </form>
    </div>
  );
}
