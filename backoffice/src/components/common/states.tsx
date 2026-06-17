// ========================================
// COMPONENTE: Estados de carga y error
// DESCRIPCIÓN:
// Helpers visuales para los estados de las queries:
// spinner de carga y panel de error con reintento.
// ========================================
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoadingState({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}

export function ErrorState({ mensaje, onReintentar }: { mensaje?: string; onReintentar?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="max-w-md text-sm text-foreground">{mensaje ?? 'Ocurrió un error al cargar los datos.'}</p>
      {onReintentar && (
        <Button variant="outline" size="sm" onClick={onReintentar}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
