import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { SelectorResidente } from '@/components/Layout';
import { Cargando, ErrorCaja, Tarjeta, mensajeDeError } from '@/components/ui';
import { diaSinTildes, hoyISO, minutosAhora, sinTildes } from '@/lib/format';
import { confirmarAviso, getAgenda, getAlbumes, getInicio, getNoticias } from '@/services/familia';
import { InicioVista } from './InicioVista';

export function InicioPage() {
  const qc = useQueryClient();
  const { me, residente } = useAuth();
  const residenteId = residente?.id ?? null;
  const hoy = hoyISO();

  const inicioQ = useQuery({ queryKey: ['inicio', residenteId], queryFn: () => getInicio(residenteId) });
  // Lo demás enriquece la pantalla: si falla, esa sección simplemente no aparece (no se rompe todo el Inicio).
  const agendaQ = useQuery({ queryKey: ['agenda', residenteId, hoy], queryFn: () => getAgenda(residenteId!, hoy, hoy), enabled: !!residenteId });
  const albumesQ = useQuery({ queryKey: ['albumes'], queryFn: getAlbumes });
  const noticiasQ = useQuery({ queryKey: ['noticias'], queryFn: getNoticias });

  const [ahoraMin, setAhoraMin] = useState(minutosAhora);
  useEffect(() => {
    const t = setInterval(() => setAhoraMin(minutosAhora()), 60_000);
    return () => clearInterval(t);
  }, []);

  const confirmar = useMutation({
    mutationFn: confirmarAviso,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inicio'] });
      void qc.invalidateQueries({ queryKey: ['avisos'] });
    },
  });

  const actividadesHoy = useMemo(() => {
    if (!agendaQ.data || !agendaQ.data.actividadesDisponibles) return null;
    const dia = diaSinTildes(hoy);
    return agendaQ.data.actividades.filter((a) => sinTildes(a.dia) === dia);
  }, [agendaQ.data, hoy]);

  if (!me) return null;
  if (inicioQ.isLoading) return <Cargando texto="Preparando tu inicio…" />;
  if (inicioQ.isError || !inicioQ.data) return <ErrorCaja error={inicioQ.error} onReintentar={() => void inicioQ.refetch()} />;

  if (me.residentes.length === 0) {
    return (
      <Tarjeta className="text-center">
        <p className="text-3xl" aria-hidden>👪</p>
        <p className="mt-2 text-lg font-bold">Todavía no tenés ningún residente vinculado</p>
        <p className="text-soft">Consultale a la residencia para que te vincule con tu familiar.</p>
      </Tarjeta>
    );
  }

  return (
    <div className="space-y-5">
      <SelectorResidente />
      <InicioVista
        nombreFamiliar={me.familiar.nombre}
        residente={residente}
        inicio={inicioQ.data}
        actividadesHoy={actividadesHoy}
        recordatoriosHoy={(agendaQ.data?.recordatorios ?? []).filter((r) => r.fecha === hoy)}
        albumes={albumesQ.data ?? []}
        noticias={noticiasQ.data ?? []}
        institucion={me.institucion}
        ahoraMin={ahoraMin}
        onConfirmar={(id) => confirmar.mutate(id)}
        confirmandoId={confirmar.isPending ? (confirmar.variables ?? null) : null}
        errorConfirmar={confirmar.isError ? mensajeDeError(confirmar.error) : null}
      />
    </div>
  );
}
