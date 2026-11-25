// ========================================
// COMPONENTE: Estados de carga y error
// DESCRIPCIÓN:
// Helpers visuales para los estados de las queries:
// spinner de carga y panel de error con reintento.
// El error lo acompaña Mate (la mascota de ElderTech): lenguaje claro,
// sin culpar a nadie y siempre con una salida ("Intentar de nuevo").
// ========================================
import { Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Mate } from '@/components/common/Mate';
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
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/70 to-card px-6 py-10 text-center dark:border-rose-900/60 dark:from-rose-950/30"
    >
      <Mate estado="preocupado" animado className="h-24 w-24" />
      <h3 className="mt-1 text-lg font-semibold text-foreground">No pudimos cargar esto</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {mensajeAmigable(mensaje) ?? 'Algo salió mal al traer los datos. No es culpa tuya. Probá de nuevo en unos segundos.'}
      </p>
      {onReintentar && (
        <Button className="mt-3" onClick={onReintentar}>
          <RotateCw className="h-4 w-4" /> Intentar de nuevo
        </Button>
      )}
    </div>
  );
}
