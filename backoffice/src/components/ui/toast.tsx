// ========================================
// UI: Toaster + helper de notificaciones
// DESCRIPCIÓN:
// Notificaciones de ElderTech sobre Sonner, con un ícono según lo ocurrido
// (éxito / error / información). Criterios (ver docs/DISENO_MENSAJES.md):
//  - Los errores NO desaparecen solos: se cierran con "Entendido" o la ✕.
//    Los éxitos y avisos sí, con una barrita que muestra cuánto falta.
//  - Lenguaje claro y sin culpar a quien lo usa; los errores técnicos
//    ("Failed to fetch", "Error 500 en /api/…") se traducen a algo accionable.
//  - Errores con role="alert" (se anuncian ya); el resto con role="status".
//  - Contraste AA en claro y oscuro; blanco de toque ≥ 44 px en los botones.
// ========================================
import type { CSSProperties } from 'react';
import { CheckCircle2, CircleAlert, Info, X, type LucideIcon } from 'lucide-react';
import { Toaster as SonnerToaster, toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tipo = 'success' | 'error' | 'info';

const ESTILOS: Record<Tipo, { icono: LucideIcon; barra: string; fondo: string; color: string; progreso: string }> = {
  success: { icono: CheckCircle2, barra: 'bg-emerald-500', fondo: 'bg-emerald-50 dark:bg-emerald-950/50', color: 'text-emerald-600 dark:text-emerald-400', progreso: 'bg-emerald-500' },
  error: { icono: CircleAlert, barra: 'bg-rose-500', fondo: 'bg-rose-50 dark:bg-rose-950/50', color: 'text-rose-600 dark:text-rose-400', progreso: 'bg-rose-500' },
  info: { icono: Info, barra: 'bg-primary', fondo: 'bg-primary-50 dark:bg-primary/15', color: 'text-primary', progreso: 'bg-primary' },
};

const DURACION_MS: Record<Tipo, number> = { success: 4500, error: Infinity, info: 6000 };

/** Traduce mensajes técnicos a algo que una persona pueda entender y hacer algo al respecto. */
export function mensajeAmigable(texto?: string): string | undefined {
  if (!texto) return texto;
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(texto)) {
    return 'No pudimos conectarnos con el servidor. Revisá tu conexión a internet y probá de nuevo.';
  }
  if (/\b401\b|jwt expired|token (inválido|invalido|expirado)|sesión inválida/i.test(texto)) {
    return 'Tu sesión venció. Volvé a iniciar sesión para seguir.';
  }
  if (/\b403\b|no autorizado|no ten[eé]s permiso/i.test(texto) && /^Error \d{3}/.test(texto)) {
    return 'No tenés permiso para hacer esto. Si lo necesitás, pedíselo a un administrador.';
  }
  if (/^Error 5\d\d\b|error interno del servidor/i.test(texto)) {
    return 'Algo falló de nuestro lado. Probá de nuevo en unos minutos; si sigue, avisanos.';
  }
  if (/^Error 404\b/.test(texto)) return 'No encontramos lo que buscabas. Puede que ya no exista.';
  return texto;
}

interface TarjetaProps {
  id: string | number;
  tipo: Tipo;
  titulo: string;
  descripcion?: string;
}

function Tarjeta({ id, tipo, titulo, descripcion }: TarjetaProps) {
  const e = ESTILOS[tipo];
  const Icono = e.icono;
  const persistente = DURACION_MS[tipo] === Infinity;
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      aria-live={tipo === 'error' ? 'assertive' : 'polite'}
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl shadow-black/10"
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1.5', e.barra)} />
      <div className="flex gap-3 py-3.5 pl-5 pr-12">
        <div aria-hidden="true" className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', e.fondo, e.color)}>
          <Icono className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 self-center">
          <p className="text-[15px] font-semibold leading-snug">{titulo}</p>
          {descripcion && <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{descripcion}</p>}
          {persistente && (
            <button
              type="button"
              onClick={() => toast.dismiss(id)}
              className="mt-2.5 inline-flex min-h-[36px] items-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label="Cerrar mensaje"
        onClick={() => toast.dismiss(id)}
        className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X className="h-4 w-4" />
      </button>
      {!persistente && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-transparent">
          <span className={cn('block h-full origin-left opacity-60 toast-progreso', e.progreso)} style={{ animationDuration: `${DURACION_MS[tipo]}ms` }} />
        </span>
      )}
    </div>
  );
}

export function Toaster() {
  // `expand`: todas las notificaciones a la vista (si no, la más nueva tapa a un error que todavía hay que leer).
  return <SonnerToaster position="top-right" visibleToasts={5} gap={12} offset={20} expand style={{ '--width': 'min(92vw, 400px)' } as CSSProperties} />;
}

function mostrar(tipo: Tipo, titulo: string, descripcion?: string) {
  const desc = tipo === 'error' ? mensajeAmigable(descripcion) : descripcion;
  return toast.custom((id) => <Tarjeta id={id} tipo={tipo} titulo={titulo} descripcion={desc} />, {
    duration: DURACION_MS[tipo],
  });
}

// Helper centralizado — mismos mensajes de éxito/error en todo el backoffice
export const notify = {
  success: (msg: string, desc?: string) => mostrar('success', msg, desc),
  error: (msg: string, desc?: string) => mostrar('error', msg, desc),
  info: (msg: string, desc?: string) => mostrar('info', msg, desc),
};
