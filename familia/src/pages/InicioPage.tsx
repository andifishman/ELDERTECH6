import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CalendarClock, Camera, CheckCircle2, ChevronRight, MessageCircle } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { SelectorResidente } from '@/components/Layout';
import { Boton, Cargando, ErrorCaja, Etiqueta, Tarjeta, Titulo, mensajeDeError } from '@/components/ui';
import { fechaHora } from '@/lib/format';
import { confirmarAviso, getInicio } from '@/services/familia';

export function InicioPage() {
  const qc = useQueryClient();
  const { me, residente } = useAuth();
  const inicioQ = useQuery({ queryKey: ['inicio', residente?.id ?? null], queryFn: () => getInicio(residente?.id ?? null) });
  const confirmar = useMutation({
    mutationFn: confirmarAviso,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inicio'] });
      void qc.invalidateQueries({ queryKey: ['avisos'] });
    },
  });

  if (!me) return null;
  if (inicioQ.isLoading) return <Cargando />;
  if (inicioQ.isError || !inicioQ.data) return <ErrorCaja error={inicioQ.error} onReintentar={() => void inicioQ.refetch()} />;
  const d = inicioQ.data;
  const nada = d.avisosSinLeer === 0 && !d.proximaActividad && d.fotosNuevas === 0 && d.mensajesSinLeer === 0 && d.proximosEventos.length === 0;

  return (
    <div className="space-y-4">
      <Titulo sub={residente ? `Esto es lo importante de hoy sobre ${residente.nombre}.` : undefined}>Hola, {me.familiar.nombre}</Titulo>
      <SelectorResidente />

      {me.residentes.length === 0 && (
        <Tarjeta>
          <p className="font-semibold">Todavía no tenés ningún residente vinculado.</p>
          <p className="text-soft">Consultale a la residencia para que te vincule con tu familiar.</p>
        </Tarjeta>
      )}

      {d.avisosImportantes.map((a) => (
        <Tarjeta key={a.id} className="border-2 border-red-300 bg-red-50">
          <div className="mb-1 flex items-center gap-2"><Bell className="h-5 w-5 text-red-800" aria-hidden /><Etiqueta color="rojo">Aviso importante</Etiqueta></div>
          <h2 className="text-lg font-bold">{a.titulo}</h2>
          <p className="mt-1 whitespace-pre-line break-words">{a.texto}</p>
          {confirmar.isError && confirmar.variables === a.id && <p role="alert" className="mt-2 text-red-900">{mensajeDeError(confirmar.error)}</p>}
          <Boton className="mt-3" bloque cargando={confirmar.isPending && confirmar.variables === a.id} onClick={() => confirmar.mutate(a.id)}>
            <CheckCircle2 className="h-5 w-5" aria-hidden /> Ya lo leí
          </Boton>
        </Tarjeta>
      ))}

      {d.avisosSinLeer > d.avisosImportantes.length && (
        <Link to="/avisos" className="block">
          <Tarjeta className="flex items-center gap-3">
            <Bell className="h-7 w-7 shrink-0 text-primary-600" aria-hidden />
            <div className="flex-1"><p className="font-semibold">Avisos sin leer</p><p className="text-soft">Tenés {d.avisosSinLeer - d.avisosImportantes.length} más para confirmar.</p></div>
            <ChevronRight className="h-6 w-6 text-primary-600" aria-hidden />
          </Tarjeta>
        </Link>
      )}

      {d.mensajesSinLeer > 0 && (
        <Link to="/mensajes" className="block">
          <Tarjeta className="flex items-center gap-3">
            <MessageCircle className="h-7 w-7 shrink-0 text-primary-600" aria-hidden />
            <div className="flex-1"><p className="font-semibold">{d.mensajesSinLeer === 1 ? 'Tenés 1 mensaje nuevo' : `Tenés ${d.mensajesSinLeer} mensajes nuevos`}</p><p className="text-soft">Tocá para leerlos.</p></div>
            <ChevronRight className="h-6 w-6 text-primary-600" aria-hidden />
          </Tarjeta>
        </Link>
      )}

      {d.proximaActividad && (
        <Link to="/calendario" className="block">
          <Tarjeta className="flex items-center gap-3">
            <CalendarClock className="h-7 w-7 shrink-0 text-primary-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-soft">Próxima actividad de {d.proximaActividad.residenteNombre} hoy</p>
              <p className="text-lg font-bold">{d.proximaActividad.nombre}</p>
              <p className="text-soft">{d.proximaActividad.horario}{d.proximaActividad.lugar ? ` · ${d.proximaActividad.lugar}` : ''}</p>
            </div>
            <ChevronRight className="h-6 w-6 text-primary-600" aria-hidden />
          </Tarjeta>
        </Link>
      )}

      {d.fotosNuevas > 0 && (
        <Link to="/fotos" className="block">
          <Tarjeta className="flex items-center gap-3">
            <Camera className="h-7 w-7 shrink-0 text-primary-600" aria-hidden />
            <div className="flex-1"><p className="font-semibold">{d.fotosNuevas === 1 ? 'Hay 1 álbum de fotos nuevo' : `Hay ${d.fotosNuevas} álbumes de fotos nuevos`}</p><p className="text-soft">De las actividades de esta semana.</p></div>
            <ChevronRight className="h-6 w-6 text-primary-600" aria-hidden />
          </Tarjeta>
        </Link>
      )}

      {d.proximosEventos.length > 0 && (
        <section aria-labelledby="proximos-eventos" className="space-y-2">
          <h2 id="proximos-eventos" className="text-lg font-bold text-primary-800">Próximos eventos</h2>
          {d.proximosEventos.map((e) => (
            <Link key={e.id} to="/calendario?tab=eventos" className="block">
              <Tarjeta className="flex items-center gap-3">
                <div className="min-w-0 flex-1"><p className="font-semibold">{e.titulo}</p><p className="text-soft">{fechaHora(e.inicia_en)}{e.lugar ? ` · ${e.lugar}` : ''}</p></div>
                {e.abierto_inscripcion && <Etiqueta color={e.mi_inscripcion ? 'verde' : 'violeta'}>{e.mi_inscripcion ? 'Anotado' : 'Podés anotarte'}</Etiqueta>}
              </Tarjeta>
            </Link>
          ))}
        </section>
      )}

      {nada && me.residentes.length > 0 && (
        <Tarjeta className="text-center"><p className="text-lg font-semibold">Todo al día</p><p className="text-soft">No hay novedades por ahora.</p></Tarjeta>
      )}
    </div>
  );
}
