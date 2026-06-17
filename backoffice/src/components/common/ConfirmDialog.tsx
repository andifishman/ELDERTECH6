// ========================================
// COMPONENTE: ConfirmDialog
// DESCRIPCIÓN:
// Diálogo de confirmación reutilizable para acciones
// destructivas (eliminar, pausar). Estado de carga en el
// botón de confirmación.
// ========================================
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  descripcion?: string;
  textoConfirmar?: string;
  variante?: 'default' | 'destructive';
  cargando?: boolean;
  onConfirmar: () => void;
}

export function ConfirmDialog({
  abierto,
  onOpenChange,
  titulo,
  descripcion,
  textoConfirmar = 'Confirmar',
  variante = 'destructive',
  cargando,
  onConfirmar,
}: ConfirmDialogProps) {
  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cargando}>
            Cancelar
          </Button>
          <Button variant={variante} onClick={onConfirmar} disabled={cargando}>
            {cargando ? 'Procesando…' : textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
