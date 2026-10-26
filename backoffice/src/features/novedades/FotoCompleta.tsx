// ========================================
// COMPONENTE: FotoCompleta
// DESCRIPCIÓN:
// Foto de novedad que se ve siempre completa (sin recortar)
// dentro de un recuadro fijo, sea cual sea su tamaño. El
// espacio que sobra se rellena con la misma foto difuminada.
// Igual que FotoCompleta de la app, para que la vista previa
// coincida con lo que ve el residente.
// ========================================
import { cn } from '@/lib/utils';

export function FotoCompleta({ src, alt = '', className }: { src: string; alt?: string; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl" />
      <div className="absolute inset-0 bg-white/35" />
      <img src={src} alt={alt} className="relative h-full w-full object-contain" />
    </div>
  );
}
