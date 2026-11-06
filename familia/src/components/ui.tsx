// Piezas de interfaz de la app de familiares. Todo pensado para leerse y tocarse fácil:
// letra grande, mucho contraste, botones de al menos 48 px.
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { ApiError } from '@/lib/apiClient';

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
  secundario: 'border-2 border-primary-600 bg-white text-primary-700 hover:bg-primary-50',
  peligro: 'bg-red-700 text-white hover:bg-red-800',
  fantasma: 'text-primary-700 hover:bg-primary-50',
};

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  bloque?: boolean;
}

export function Boton({ variante = 'primario', cargando, bloque, className, children, disabled, type = 'button', ...resto }: BotonProps) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={clsx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTES[variante],
        bloque && 'w-full',
        className,
      )}
      {...resto}
    >
      {cargando && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Tarjeta({ className, children, ...resto }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('rounded-2xl border border-primary-100 bg-white p-4 shadow-sm', className)} {...resto}>
      {children}
    </div>
  );
}

export function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold text-primary-800">{children}</h1>
      {sub && <p className="mt-1 text-sm text-soft">{sub}</p>}
    </header>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-soft" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden />
      <p>{texto}</p>
    </div>
  );
}

export function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : 'Algo salió mal. Probá de nuevo.';
}

export function ErrorCaja({ error, onReintentar }: { error?: unknown; onReintentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="h-8 w-8 text-red-700" aria-hidden />
      <p className="text-red-900">{error ? mensajeDeError(error) : 'No pudimos cargar esta información.'}</p>
      {onReintentar && <Boton variante="secundario" onClick={onReintentar}>Reintentar</Boton>}
    </div>
  );
}

export function Vacio({ icono, titulo, texto }: { icono: ReactNode; titulo: string; texto?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-primary-200 bg-white px-6 py-12 text-center">
      <div className="mb-3 text-primary-600" aria-hidden>{icono}</div>
      <p className="text-lg font-semibold text-ink">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-soft">{texto}</p>}
    </div>
  );
}

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'error' | 'exito'; children: ReactNode }) {
  return (
    <p
      role={tipo === 'error' ? 'alert' : 'status'}
      className={clsx('rounded-xl px-4 py-3 text-sm', tipo === 'error' && 'bg-red-50 text-red-900', tipo === 'info' && 'bg-primary-50 text-primary-800', tipo === 'exito' && 'bg-green-50 text-green-900')}
    >
      {children}
    </p>
  );
}

export const Campo = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }>(function Campo({ etiqueta, ayuda, id, className, ...resto }, ref) {
  const idCampo = id ?? `campo-${etiqueta.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block font-semibold">{etiqueta}</label>
      <input ref={ref} id={idCampo} className={clsx('min-h-12 w-full rounded-xl border-2 border-primary-200 bg-white px-4 py-2 text-base placeholder:text-gray-500 focus:border-primary-600', className)} {...resto} />
      {ayuda && <p className="text-sm text-soft">{ayuda}</p>}
    </div>
  );
});

export function AreaTexto({ etiqueta, className, id, ...resto }: TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string }) {
  const idCampo = id ?? `area-${etiqueta.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block font-semibold">{etiqueta}</label>
      <textarea id={idCampo} className={clsx('min-h-28 w-full rounded-xl border-2 border-primary-200 bg-white px-4 py-3 text-base placeholder:text-gray-500 focus:border-primary-600', className)} {...resto} />
    </div>
  );
}

export function Etiqueta({ children, color = 'violeta' }: { children: ReactNode; color?: 'violeta' | 'rojo' | 'verde' | 'ambar' | 'gris' }) {
  const colores = {
    violeta: 'bg-primary-100 text-primary-800',
    rojo: 'bg-red-100 text-red-900',
    verde: 'bg-green-100 text-green-900',
    ambar: 'bg-amber-100 text-amber-900',
    gris: 'bg-gray-100 text-gray-800',
  };
  return <span className={clsx('inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold', colores[color])}>{children}</span>;
}

/** Pestañas accesibles (botones con aria-pressed) para alternar secciones dentro de una pantalla. */
export function Pestanas<T extends string>({ valor, onCambio, opciones }: { valor: T; onCambio: (v: T) => void; opciones: Array<{ id: T; texto: string }> }) {
  return (
    <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-primary-50 p-1">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={valor === o.id}
          onClick={() => onCambio(o.id)}
          className={clsx('min-h-12 flex-1 whitespace-nowrap rounded-xl px-3 py-2 font-semibold transition-colors', valor === o.id ? 'bg-white text-primary-800 shadow-sm' : 'text-soft hover:text-primary-800')}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
