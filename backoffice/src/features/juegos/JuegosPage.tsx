// ========================================
// PANTALLA: JuegosPage
// DESCRIPCIÓN:
// Ranking y estadísticas de los juegos de los residentes: una tarjeta
// por juego (partidas, jugadores, mejor puntaje) y, al elegir uno, la
// tabla de quién hizo más puntos. Los datos los agrega la base y los
// cachea el backend 10 min; "Actualizar" fuerza un recálculo.
// ========================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState, ErrorState } from '@/components/common/states';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { obtenerRankingJuego, obtenerResumenJuegos, type Periodo } from '@/services/juegosService';

interface InfoJuego {
  emoji: string;
  titulo: string;
  /** Juegos de puntaje se ordenan por mejor puntaje; el resto por partidas ganadas. */
  tienePuntaje: boolean;
  etiquetaPuntaje?: string;
}

const JUEGOS: Record<string, InfoJuego> = {
  jardin: { emoji: '🌸', titulo: 'Jardín ElderTech', tienePuntaje: true, etiquetaPuntaje: 'Mejor puntaje' },
  bloques: { emoji: '🧱', titulo: 'Bloques ElderTech', tienePuntaje: true, etiquetaPuntaje: 'Mejor puntaje' },
  palabras: { emoji: '🔠', titulo: 'Palabras', tienePuntaje: true, etiquetaPuntaje: 'Nivel alcanzado' },
  ahorcado: { emoji: '🪢', titulo: 'Ahorcado', tienePuntaje: false },
  memotest: { emoji: '🃏', titulo: 'Memotest', tienePuntaje: false },
  simon: { emoji: '🎮', titulo: 'Simon', tienePuntaje: false },
  conexiones: { emoji: '🔗', titulo: 'Conexiones', tienePuntaje: false },
  laberinto: { emoji: '🌀', titulo: 'Laberinto', tienePuntaje: false },
  sopa: { emoji: '🔤', titulo: 'Sopa de Letras', tienePuntaje: false },
  puntos: { emoji: '🔵', titulo: 'Une los Puntos', tienePuntaje: false },
};

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: 'todo', label: 'Todo el tiempo' },
  { valor: 'mes', label: 'Últimos 30 días' },
  { valor: 'semana', label: 'Últimos 7 días' },
];

const MEDALLAS = ['🥇', '🥈', '🥉'];
const DIEZ_MINUTOS = 10 * 60 * 1000;

export function JuegosPage() {
  const qc = useQueryClient();
  const [periodo, setPeriodo] = useState<Periodo>('todo');
  const [juego, setJuego] = useState<string>('palabras');
  const [actualizando, setActualizando] = useState(false);

  const resumen = useQuery({
    queryKey: ['juegos', 'resumen', periodo],
    queryFn: () => obtenerResumenJuegos(periodo),
    staleTime: DIEZ_MINUTOS,
  });
  const ranking = useQuery({
    queryKey: ['juegos', 'ranking', juego, periodo],
    queryFn: () => obtenerRankingJuego(juego, periodo),
    staleTime: DIEZ_MINUTOS,
  });

  // "Actualizar": pide al backend que recalcule saltando su caché y reemplaza lo guardado.
  async function actualizar() {
    setActualizando(true);
    try {
      const [r, k] = await Promise.all([obtenerResumenJuegos(periodo, true), obtenerRankingJuego(juego, periodo, true)]);
      qc.setQueryData(['juegos', 'resumen', periodo], r);
      qc.setQueryData(['juegos', 'ranking', juego, periodo], k);
    } finally {
      setActualizando(false);
    }
  }

  const info = JUEGOS[juego] ?? { emoji: '🎲', titulo: juego, tienePuntaje: false };
  const generadoEn = ranking.data?.generadoEn ?? resumen.data?.generadoEn;

  return (
    <div>
      <PageHeader
        titulo="Juegos"
        descripcion="Quién juega más y quién hizo más puntos en cada juego"
        acciones={
          <>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void actualizar()} disabled={actualizando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${actualizando ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
          </>
        }
      />

      {generadoEn && (
        <p className="-mt-3 mb-4 text-xs text-muted-foreground">
          Datos calculados {formatDistanceToNow(new Date(generadoEn), { addSuffix: true, locale: es })}. Se refrescan solos cada 10 minutos.
        </p>
      )}

      {resumen.isLoading ? (
        <LoadingState mensaje="Cargando juegos…" />
      ) : resumen.isError || !resumen.data ? (
        <ErrorState onReintentar={() => void resumen.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[...resumen.data.datos]
              .sort((a, b) => b.partidas - a.partidas)
              .map((r) => {
                const j = JUEGOS[r.juego] ?? { emoji: '🎲', titulo: r.juego, tienePuntaje: false };
                const activo = r.juego === juego;
                return (
                  <button
                    key={r.juego}
                    type="button"
                    onClick={() => setJuego(r.juego)}
                    className={`rounded-xl border p-3 text-left transition hover:border-primary ${activo ? 'border-primary bg-primary-50 ring-2 ring-primary/30' : 'border-border bg-card'}`}
                  >
                    <div className="text-2xl">{j.emoji}</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{j.titulo}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="font-bold text-primary">{r.partidas}</span> partidas · <span className="font-bold text-primary">{r.jugadores}</span> jugadores
                    </div>
                    {j.tienePuntaje && r.mejorPuntaje !== null && (
                      <div className="text-xs text-muted-foreground">Récord: <span className="font-semibold">{r.mejorPuntaje.toLocaleString('es-AR')}</span></div>
                    )}
                  </button>
                );
              })}
          </div>

          <Card className="mt-6">
            <div className="flex items-center gap-2 border-b border-border p-4">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">{info.emoji} Ranking de {info.titulo}</h3>
            </div>
            {ranking.isLoading ? (
              <LoadingState mensaje="Cargando ranking…" />
            ) : ranking.isError || !ranking.data ? (
              <ErrorState onReintentar={() => void ranking.refetch()} />
            ) : ranking.data.datos.length === 0 ? (
              <EmptyState icono={Trophy} titulo="Nadie jugó todavía" descripcion="Cuando los residentes jueguen, van a aparecer acá." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>Residente</TableHead>
                      {info.tienePuntaje && <TableHead className="text-right">{info.etiquetaPuntaje}</TableHead>}
                      <TableHead className="text-right">Veces jugado</TableHead>
                      {!info.tienePuntaje && <TableHead className="text-right">Ganó</TableHead>}
                      {!info.tienePuntaje && <TableHead className="text-right">Perdió</TableHead>}
                      <TableHead className="text-right">Última vez</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.data.datos.map((f, i) => (
                      <TableRow key={f.residenteId}>
                        <TableCell className="text-lg">{MEDALLAS[i] ?? i + 1}</TableCell>
                        <TableCell>
                          <Link to={`/usuarios/${f.residenteId}`} className="font-medium text-primary hover:underline">{f.nombre}</Link>
                        </TableCell>
                        {info.tienePuntaje && (
                          <TableCell className="text-right font-bold">{f.mejorPuntaje !== null ? f.mejorPuntaje.toLocaleString('es-AR') : '—'}</TableCell>
                        )}
                        <TableCell className="text-right">{f.partidas}</TableCell>
                        {!info.tienePuntaje && <TableCell className="text-right">{f.ganadas}</TableCell>}
                        {!info.tienePuntaje && <TableCell className="text-right">{f.perdidas}</TableCell>}
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {f.ultimaPartida ? formatDistanceToNow(new Date(f.ultimaPartida), { addSuffix: true, locale: es }) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
