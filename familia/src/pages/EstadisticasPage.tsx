import { useQuery } from '@tanstack/react-query';
import { BookOpen, Flower2, Gamepad2, Trophy, Type } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { SelectorResidente } from '@/components/Layout';
import { Cargando, ErrorCaja, Tarjeta, Titulo, Vacio } from '@/components/ui';
import { fechaRelativa } from '@/lib/format';
import { getEstadisticas } from '@/services/familia';

const JUEGOS: Record<string, { emoji: string; titulo: string }> = {
  ahorcado: { emoji: '🪢', titulo: 'Ahorcado' },
  memotest: { emoji: '🃏', titulo: 'Memotest' },
  simon: { emoji: '🎮', titulo: 'Simon' },
  conexiones: { emoji: '🔗', titulo: 'Conexiones' },
  laberinto: { emoji: '🌀', titulo: 'Laberinto' },
  sopa: { emoji: '🔤', titulo: 'Sopa de Letras' },
  puntos: { emoji: '🔵', titulo: 'Une los Puntos' },
  jardin: { emoji: '🌸', titulo: 'Jardín ElderTech' },
  bloques: { emoji: '🧱', titulo: 'Bloques ElderTech' },
  palabras: { emoji: '🔠', titulo: 'Palabras' },
};

function Dato({ icono, valor, texto, caja }: { icono: ReactNode; valor: string | number; texto: string; caja: string }) {
  return (
    <div className={`flex flex-col gap-1 rounded-3xl border-2 p-4 shadow-suave ${caja}`}>
      <span aria-hidden>{icono}</span>
      <span className="font-display text-3xl font-extrabold leading-none text-ink">{valor}</span>
      <span className="text-sm font-bold">{texto}</span>
    </div>
  );
}

export function EstadisticasPage() {
  const { residente } = useAuth();
  const q = useQuery({ queryKey: ['estadisticas', residente?.id], queryFn: () => getEstadisticas(residente!.id), enabled: !!residente });
  const nombre = residente?.nombre ?? 'tu familiar';

  return (
    <div>
      <Titulo sub={`Cómo le va a ${nombre} con los juegos y los tutoriales de su aplicación.`}>Sus juegos</Titulo>
      <SelectorResidente />
      {!residente && <Vacio icono={<Gamepad2 className="h-10 w-10" />} titulo="No tenés un residente vinculado" texto="Consultale a la residencia." />}
      {q.isLoading && <Cargando />}
      {q.isError && <ErrorCaja error={q.error} onReintentar={() => void q.refetch()} />}
      {q.data && (() => {
        const { juegos, totalPartidas, progreso: p } = q.data;
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Dato icono={<Gamepad2 className="h-7 w-7 text-primary-700" />} valor={totalPartidas} texto={totalPartidas === 1 ? 'partida jugada' : 'partidas jugadas'} caja="border-primary-200 bg-primary-100" />
              <Dato icono={<Flower2 className="h-7 w-7 text-rosa-700" />} valor={p.jardin.niveles} texto={`niveles del Jardín · ${p.jardin.estrellas} ⭐`} caja="border-rosa-200 bg-rosa-100" />
              <Dato icono={<Type className="h-7 w-7 text-agua-700" />} valor={p.palabras.nivelMaximo} texto={`nivel más alto en Palabras (${p.palabras.niveles} superados)`} caja="border-agua-200 bg-agua-100" />
              <Dato icono={<BookOpen className="h-7 w-7 text-sol-900" />} valor={p.tutoriales.completados} texto={`tutoriales completados de ${p.tutoriales.vistos} vistos`} caja="border-sol-200 bg-sol-100" />
            </div>

            <section aria-label="Juegos jugados">
              <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-primary-800"><Trophy className="h-5 w-5" aria-hidden /> Juego por juego</h2>
              {juegos.length === 0 ? (
                <Vacio icono={<Gamepad2 className="h-10 w-10" />} titulo={`${nombre} todavía no jugó`} texto="Cuando juegue, vas a ver acá cómo le va." />
              ) : (
                <ul className="space-y-2">
                  {juegos.map((j) => {
                    const info = JUEGOS[j.juego] ?? { emoji: '🎲', titulo: j.juego };
                    return (
                      <li key={j.juego}>
                        <Tarjeta>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-bold"><span aria-hidden>{info.emoji}</span> {info.titulo}</p>
                            <p className="shrink-0 rounded-full bg-primary-100 px-3 py-1 font-bold text-primary-800">{j.partidas} {j.partidas === 1 ? 'vez' : 'veces'}</p>
                          </div>
                          <p className="mt-1 text-soft">
                            {j.ganadas + j.perdidas > 0 && <>Ganó {j.ganadas} · Perdió {j.perdidas}</>}
                            {j.ganadas + j.perdidas > 0 && j.mejorPuntaje !== null && ' · '}
                            {j.mejorPuntaje !== null && <>Mejor puntaje: {j.mejorPuntaje.toLocaleString('es-AR')}</>}
                          </p>
                          {j.ultimaPartida && <p className="text-sm text-soft">Última vez: {fechaRelativa(j.ultimaPartida)}</p>}
                        </Tarjeta>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        );
      })()}
    </div>
  );
}
