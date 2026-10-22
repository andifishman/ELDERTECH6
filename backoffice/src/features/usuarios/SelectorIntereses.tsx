// ========================================
// COMPONENTE: SelectorIntereses
// DESCRIPCIÓN:
// Chips de intereses que se prenden/apagan con un clic. Se usa al
// crear/editar un usuario y en la ficha del residente.
// ========================================
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Interes } from '@/types/database.types';

/** Selector de intereses: chips que se prenden/apagan con un clic. */
export function SelectorIntereses({
  intereses,
  seleccionados,
  onCambiar,
  cargando,
}: {
  intereses: Interes[];
  seleccionados: string[];
  onCambiar: (ids: string[]) => void;
  cargando: boolean;
}) {
  if (cargando) return <p className="text-sm text-muted-foreground">Cargando intereses…</p>;
  if (intereses.length === 0) return <p className="text-sm text-muted-foreground">No hay intereses cargados.</p>;

  const alternar = (id: string) =>
    onCambiar(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id]);

  return (
    <div className="flex flex-wrap gap-2">
      {intereses.map((i) => {
        const activo = seleccionados.includes(i.id);
        return (
          <button
            key={i.id}
            type="button"
            onClick={() => alternar(i.id)}
            aria-pressed={activo}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
              activo
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-input bg-background text-muted-foreground hover:border-ring hover:text-foreground',
            )}
          >
            {activo ? <Check className="h-3.5 w-3.5" /> : i.emoji && <span aria-hidden>{i.emoji}</span>}
            {i.nombre}
          </button>
        );
      })}
    </div>
  );
}
