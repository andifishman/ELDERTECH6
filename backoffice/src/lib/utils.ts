// ========================================
// UTIL: cn (classnames)
// DESCRIPCIÓN:
// Combina clases de Tailwind resolviendo conflictos.
// Patrón estándar de shadcn/ui usado por todos los
// componentes de UI del backoffice.
// ========================================
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// formatea una hora "HH:MM:SS" → "HH:MM"
export function formatHora(hora?: string | null): string {
  if (!hora) return '--:--';
  return hora.slice(0, 5);
}

// devuelve las iniciales de un nombre para los avatares
export function iniciales(nombre?: string | null): string {
  if (!nombre) return '?';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
