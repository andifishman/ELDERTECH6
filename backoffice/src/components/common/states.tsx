// ========================================
// COMPONENTE: Estados de carga y error
// DESCRIPCIÓN:
// Helpers visuales para los estados de las queries:
// spinner de carga y panel de error con reintento.
// El error usa lenguaje claro, sin culpar a nadie, y siempre ofrece
// una salida ("Intentar de nuevo").
// ========================================
import { CloudOff, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mensajeAmigable } from '@/components/ui/toast';

export function LoadingState({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}

export function ErrorState({ mensaje, onReintentar }: { mensaje?: string; onReintentar?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center dark:border-rose-900/60 dark:bg-rose-950/25"
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
        <CloudOff className="h-7 w-7" />
      </div>
      <h3 className="mt-1 text-lg font-semibold text-foreground">No pudimos cargar esto</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {mensajeAmigable(mensaje) ?? 'Algo salió mal al traer los datos. Probá de nuevo en unos segundos.'}
      </p>
      {onReintentar && (
        <Button className="mt-3" onClick={onReintentar}>
          <RotateCw className="h-4 w-4" /> Intentar de nuevo
        </Button>
      )}
    </div>
  );
}
