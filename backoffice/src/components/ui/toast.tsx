// ========================================
// UI: Toaster + helper de notificaciones
// DESCRIPCIÓN:
// Envuelve Sonner con los colores de ElderTech y expone
// un helper `notify` para mensajes de éxito/error
// consistentes en todo el backoffice.
// ========================================
import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-border shadow-md',
        },
      }}
    />
  );
}

// Helper centralizado — mismos mensajes de éxito/error en toda la app
export const notify = {
  success: (msg: string, desc?: string) => toast.success(msg, { description: desc }),
  error: (msg: string, desc?: string) => toast.error(msg, { description: desc }),
  info: (msg: string, desc?: string) => toast.info(msg, { description: desc }),
};
