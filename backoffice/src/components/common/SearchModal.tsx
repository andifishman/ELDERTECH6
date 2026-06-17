import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, GraduationCap, Users, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { ActividadCompleta, Residente, TutorialConCategoria } from '@/types/database.types';

interface SearchModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

interface Resultado {
  id: string;
  tipo: 'residente' | 'tutorial' | 'actividad';
  titulo: string;
  subtitulo?: string;
  ruta: string;
}

export function SearchModal({ abierto, onCerrar }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!abierto) { setQuery(''); setResultados([]); return; }
  }, [abierto]);

  useEffect(() => {
    if (!query.trim()) { setResultados([]); return; }
    const q = query.toLowerCase();
    const items: Resultado[] = [];

    const residentes = qc.getQueryData<Residente[]>(queryKeys.residentes) ?? [];
    residentes.forEach((r) => {
      if (`${r.nombre} ${r.apellido}`.toLowerCase().includes(q)) {
        items.push({ id: r.id, tipo: 'residente', titulo: `${r.nombre} ${r.apellido}`, subtitulo: `Hab. ${r.habitacion ?? '—'}`, ruta: '/usuarios' });
      }
    });

    const tutoriales = qc.getQueryData<TutorialConCategoria[]>(queryKeys.tutoriales) ?? [];
    tutoriales.forEach((t) => {
      if (t.titulo.toLowerCase().includes(q)) {
        items.push({ id: t.id, tipo: 'tutorial', titulo: t.titulo, subtitulo: t.categoria?.nombre, ruta: `/tutoriales/${t.id}/editar` });
      }
    });

    const actividades = qc.getQueryData<ActividadCompleta[]>(queryKeys.actividades()) ?? [];
    actividades.forEach((a) => {
      if (a.nombre.toLowerCase().includes(q)) {
        items.push({ id: a.id, tipo: 'actividad', titulo: a.nombre, subtitulo: a.fecha, ruta: '/horarios' });
      }
    });

    setResultados(items.slice(0, 8));
  }, [query, qc]);

  const ir = (ruta: string) => {
    navigate(ruta);
    onCerrar();
  };

  const ICONO: Record<Resultado['tipo'], React.ReactNode> = {
    residente: <Users className="h-4 w-4 text-primary" />,
    tutorial: <GraduationCap className="h-4 w-4 text-purple-500" />,
    actividad: <Calendar className="h-4 w-4 text-red-500" />,
  };

  const LABEL: Record<Resultado['tipo'], string> = {
    residente: 'Residente',
    tutorial: 'Tutorial',
    actividad: 'Actividad',
  };

  return (
    <Dialog open={abierto} onOpenChange={onCerrar}>
      <DialogContent className="p-0 sm:max-w-xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar residentes, tutoriales, actividades…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === 'Escape' && onCerrar()}
          />
          {query && (
            <button onClick={() => setQuery('')} className="rounded p-0.5 hover:bg-accent">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {!query && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Escribí para buscar…
            </p>
          )}
          {query && resultados.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin resultados para "<span className="font-medium text-foreground">{query}</span>"
            </p>
          )}
          {resultados.map((r) => (
            <button
              key={r.id}
              onClick={() => ir(r.ruta)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                {ICONO[r.tipo]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.titulo}</p>
                {r.subtitulo && <p className="truncate text-xs text-muted-foreground">{r.subtitulo}</p>}
              </div>
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                {LABEL[r.tipo]}
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-border px-4 py-2">
          <p className="text-xs text-muted-foreground">
            <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">Ctrl K</kbd> para abrir · <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">Esc</kbd> para cerrar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
