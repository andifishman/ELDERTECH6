// ========================================
// PANTALLA: NovedadesPage
// DESCRIPCIÓN:
// Noticias para los residentes, con su estado (publicada, programada o
// borrador), buscador y filtros por estado y categoría. Cuando pasa el
// día del evento, el backend la borra sola (cron de novedades).
// Desde cada tarjeta se edita, duplica, reenvía el aviso al celular,
// publica un borrador o se elimina.
// ========================================
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, CalendarDays, Copy, Eye, FileEdit, Newspaper, Pencil, Plus, Search, Send, Trash2, Users2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/AuthContext';
import { categoriaDe, estadoDe, type CategoriaNovedad, type EstadoNovedad, type NovedadConLecturas } from '@/services/novedadesService';
import { useEliminarNovedad, usePublicarBorrador, useNovedadesLista, useReenviarAviso, useCategoriasNovedad } from './useNovedades';
import { FotoCompleta } from './FotoCompleta';

// Siempre con el año: puede haber novedades de eventos del año que viene.
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
const fechaHora = (iso: string) =>
  `${fecha(iso)}, ${new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} hs`;

const ESTADOS: Array<{ id: EstadoNovedad | 'todas'; texto: string }> = [
  { id: 'todas', texto: 'Todas' },
  { id: 'publicada', texto: 'Publicadas' },
  { id: 'programada', texto: 'Programadas' },
  { id: 'borrador', texto: 'Borradores' },
];

const BADGE_ESTADO: Record<EstadoNovedad, { variante: 'success' | 'info' | 'warning' | 'muted'; texto: string }> = {
  publicada: { variante: 'success', texto: 'Publicada' },
  programada: { variante: 'info', texto: 'Programada' },
  borrador: { variante: 'warning', texto: 'Borrador' },
  vencida: { variante: 'muted', texto: 'Vencida' },
};

export function NovedadesPage() {
  const navigate = useNavigate();
  const { puede } = useAuth();
  const novedadesQ = useNovedadesLista();
  const { opciones: categorias } = useCategoriasNovedad();
  const eliminar = useEliminarNovedad();
  const publicarBorrador = usePublicarBorrador();
  const reenviar = useReenviarAviso();

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoNovedad | 'todas'>('todas');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaNovedad | 'todas'>('todas');
  const [aEliminar, setAEliminar] = useState<NovedadConLecturas | null>(null);
  const [aReenviar, setAReenviar] = useState<NovedadConLecturas | null>(null);
  const [aPublicar, setAPublicar] = useState<NovedadConLecturas | null>(null);

  // Las vencidas no se muestran: el cron del backend las borra esa misma
  // madrugada, esto solo cubre el rato entre las 00:00 y que corra.
  const novedades = useMemo(() => (novedadesQ.data ?? []).filter((n) => estadoDe(n) !== 'vencida'), [novedadesQ.data]);

  const conteo = useMemo(() => {
    const c: Record<EstadoNovedad, number> = { publicada: 0, programada: 0, borrador: 0, vencida: 0 };
    for (const n of novedades) c[estadoDe(n)] += 1;
    return c;
  }, [novedades]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return novedades
      .filter((n) => filtroEstado === 'todas' || estadoDe(n) === filtroEstado)
      .filter((n) => filtroCategoria === 'todas' || n.categoria === filtroCategoria)
      .filter((n) => !q || n.titulo.toLowerCase().includes(q) || n.texto.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.publicar_en).getTime() - new Date(a.publicar_en).getTime());
  }, [novedades, busqueda, filtroEstado, filtroCategoria]);

  if (novedadesQ.isLoading) return <LoadingState mensaje="Cargando novedades…" />;
  if (novedadesQ.isError) return <ErrorState onReintentar={() => void novedadesQ.refetch()} />;

  const totalLecturas = novedades.filter((n) => estadoDe(n) === 'publicada').reduce((s, n) => s + n.cantidad_lecturas, 0);
  const totalDestinatarios = novedades.filter((n) => estadoDe(n) === 'publicada').reduce((s, n) => s + n.cantidad_destinatarios, 0);
  const porcentajeLectura = totalDestinatarios > 0 ? Math.round((totalLecturas / totalDestinatarios) * 100) : 0;

  const filtrando = busqueda.trim() !== '' || filtroEstado !== 'todas' || filtroCategoria !== 'todas';

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Novedades"
        descripcion="Noticias de la residencia que los residentes ven en el botón Novedades de la app. Se pueden publicar ahora, programar o dejar como borrador."
        acciones={
          puede('novedades', 'crear') ? (
            <Button onClick={() => navigate('/novedades/nueva')} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nueva novedad
            </Button>
          ) : undefined
        }
      />

      {novedades.length === 0 ? (
        <EmptyState icono={Newspaper} titulo="Todavía no hay novedades" descripcion="Publicá la primera: una fiesta, una visita, un cambio de horario o cualquier noticia de la residencia." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Resumen icono={Newspaper} titulo="Publicadas ahora" valor={String(conteo.publicada)} detalle="Se ven en la app" />
            <Resumen icono={CalendarClock} titulo="Programadas" valor={String(conteo.programada)} detalle="Salen solas a su hora" />
            <Resumen icono={FileEdit} titulo="Borradores" valor={String(conteo.borrador)} detalle="Sin publicar" />
            <Resumen icono={Eye} titulo="Lectura" valor={`${porcentajeLectura}%`} detalle={`${totalLecturas} de ${totalDestinatarios} lecturas posibles`} />
          </div>

          <div className="space-y-5">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por título o texto…" className="pl-9" aria-label="Buscar novedades" />
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-3">
              {ESTADOS.map((e) => (
                <Chip key={e.id} activo={filtroEstado === e.id} onClick={() => setFiltroEstado(e.id)}>
                  {e.texto}
                  {e.id !== 'todas' && <span className="ml-1 opacity-70">{conteo[e.id]}</span>}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-3">
              <Chip activo={filtroCategoria === 'todas'} onClick={() => setFiltroCategoria('todas')}>Todas las categorías</Chip>
              {categorias.map((c) => (
                <Chip key={c.id} activo={filtroCategoria === c.id} onClick={() => setFiltroCategoria(c.id)}>
                  {c.emoji} {c.nombre}
                </Chip>
              ))}
            </div>
          </div>

          {filtradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {filtrando ? 'Ninguna novedad coincide con la búsqueda o los filtros.' : 'No hay novedades.'}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtradas.map((n) => (
                <TarjetaNovedad
                  key={n.id}
                  n={n}
                  onEditar={puede('novedades', 'editar') ? () => navigate(`/novedades/${n.id}/editar`) : undefined}
                  onDuplicar={puede('novedades', 'crear') ? () => navigate(`/novedades/nueva?duplicar=${n.id}`) : undefined}
                  onReenviar={puede('novedades', 'editar') ? () => setAReenviar(n) : undefined}
                  onPublicar={puede('novedades', 'crear') ? () => setAPublicar(n) : undefined}
                  onEliminar={puede('novedades', 'eliminar') ? () => setAEliminar(n) : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        abierto={!!aEliminar}
        onOpenChange={(v) => { if (!v) setAEliminar(null); }}
        titulo={`¿Eliminar la novedad "${aEliminar?.titulo}"?`}
        descripcion="Deja de verse en la app enseguida. Esta acción no se puede deshacer."
        textoConfirmar="Eliminar novedad"
        variante="destructive"
        onConfirmar={() => {
          if (aEliminar) eliminar.mutate(aEliminar.id);
          setAEliminar(null);
        }}
      />
      <ConfirmDialog
        abierto={!!aReenviar}
        onOpenChange={(v) => { if (!v) setAReenviar(null); }}
        titulo={`¿Reenviar el aviso de "${aReenviar?.titulo}"?`}
        descripcion="Los residentes van a recibir otra notificación en el celular con esta novedad."
        textoConfirmar="Reenviar aviso"
        onConfirmar={() => {
          if (aReenviar) reenviar.mutate(aReenviar.id);
          setAReenviar(null);
        }}
      />
      <ConfirmDialog
        abierto={!!aPublicar}
        onOpenChange={(v) => { if (!v) setAPublicar(null); }}
        titulo={`¿Publicar "${aPublicar?.titulo}" ahora?`}
        descripcion="Se ve en la app enseguida y los residentes reciben el aviso en el celular."
        textoConfirmar="Publicar y avisar"
        onConfirmar={() => {
          if (aPublicar) publicarBorrador.mutate({ id: aPublicar.id, notificar: true, publicarEn: null });
          setAPublicar(null);
        }}
      />
    </div>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${activo ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
    >
      {children}
    </button>
  );
}

function Resumen({ icono: Icono, titulo, valor, detalle }: { icono: typeof Newspaper; titulo: string; valor: string; detalle: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
        <Icono className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <p className="text-2xl font-bold leading-tight">{valor}</p>
        <p className="truncate text-xs text-muted-foreground">{detalle}</p>
      </div>
    </Card>
  );
}

interface TarjetaProps {
  n: NovedadConLecturas;
  onEditar?: () => void;
  onDuplicar?: () => void;
  onReenviar?: () => void;
  onPublicar?: () => void;
  onEliminar?: () => void;
}

function TarjetaNovedad({ n, onEditar, onDuplicar, onReenviar, onPublicar, onEliminar }: TarjetaProps) {
  const estado = estadoDe(n);
  const { opciones: categorias } = useCategoriasNovedad();
  const cat = categoriaDe(n.categoria, categorias);
  const porcentaje = n.cantidad_destinatarios > 0 ? Math.min(100, Math.round((n.cantidad_lecturas / n.cantidad_destinatarios) * 100)) : 0;

  const cuando =
    estado === 'programada'
      ? `Sale el ${fechaHora(n.publicar_en)}`
      : estado === 'borrador'
        ? `Se vería hasta el ${fecha(n.visible_hasta)} si se publica hoy`
        : `Publicada el ${fecha(n.publicar_en)} · hasta el ${fecha(n.visible_hasta)}`;

  return (
    <Card className="flex overflow-hidden">
      {n.imagen_url && <FotoCompleta src={n.imagen_url} className="w-28 shrink-0 sm:w-36" />}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap gap-1.5">
              <Badge variant={BADGE_ESTADO[estado].variante}>{BADGE_ESTADO[estado].texto}</Badge>
              <Badge variant="purple">{cat.emoji} {cat.nombre}</Badge>
            </div>
            <p className="font-semibold leading-snug">{n.titulo}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
            {estado === 'borrador' && onPublicar && (
              <Button variant="ghost" size="icon" aria-label={`Publicar ${n.titulo}`} title="Publicar ahora" onClick={onPublicar} className="hover:text-primary">
                <Send className="h-4 w-4" />
              </Button>
            )}
            {onReenviar && estado === 'publicada' && (
              <Button variant="ghost" size="icon" aria-label={`Reenviar aviso de ${n.titulo}`} title="Reenviar aviso al celular" onClick={onReenviar}>
                <Bell className="h-4 w-4" />
              </Button>
            )}
            {onDuplicar && (
              <Button variant="ghost" size="icon" aria-label={`Duplicar ${n.titulo}`} title="Duplicar" onClick={onDuplicar}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {onEditar && (
              <Button variant="ghost" size="icon" aria-label={`Editar ${n.titulo}`} title="Editar" onClick={onEditar}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onEliminar && (
              <Button variant="ghost" size="icon" aria-label={`Eliminar ${n.titulo}`} title="Eliminar" onClick={onEliminar} className="hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{n.texto}</p>

        {n.fecha_evento && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary-700">
            <CalendarDays className="h-4 w-4" /> Evento: {fechaHora(n.fecha_evento)}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1">
            <Users2 className="h-3 w-3" /> {n.grupo_ids ? `${n.grupo_ids.length} ${n.grupo_ids.length === 1 ? 'grupo' : 'grupos'}` : 'Todos'}
          </Badge>
          {n.notificacion_id && (
            <Badge variant="outline" className="gap-1">
              <Bell className="h-3 w-3" /> Con aviso
            </Badge>
          )}
        </div>

        {estado === 'publicada' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Leída por {n.cantidad_lecturas} de {n.cantidad_destinatarios}</span>
              <span className="tabular-nums">{porcentaje}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        )}
        <p className="mt-auto text-xs text-muted-foreground">{cuando}</p>
      </div>
    </Card>
  );
}
