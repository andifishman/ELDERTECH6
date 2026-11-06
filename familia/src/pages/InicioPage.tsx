import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { SelectorResidente } from '@/components/Layout';
import { Cargando, ErrorCaja, Tarjeta, mensajeDeError } from '@/components/ui';
import { NOMBRES_DIAS, diaSinTildes, hoyISO, minutosAhora, sinTildes, sumarDias } from '@/lib/format';
import { confirmarAviso, getAgenda, getAlbumes, getInicio, getNoticias } from '@/services/familia';
import { InicioVista, type DiaSemana } from './InicioVista';

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

  // Lunes a domingo de esta semana, con cuántas actividades tiene el piso cada día
  const semana = useMemo<DiaSemana[]>(() => {
    if (!agendaQ.data?.actividadesDisponibles) return [];
    const diaDeLaSemana = new Date(`${hoy}T12:00:00Z`).getUTCDay();
    const lunes = sumarDias(hoy, -((diaDeLaSemana + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = sumarDias(lunes, i);
      const nombre = NOMBRES_DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()]!;
      return {
        fecha,
        nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
        inicial: nombre.charAt(0).toUpperCase(),
        numero: String(Number(fecha.slice(8))),
        cantidad: agendaQ.data.actividades.filter((a) => sinTildes(a.dia) === diaSinTildes(fecha) && !a.suspendido).length,
        esHoy: fecha === hoy,
      };
    });
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
        semana={semana}
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
