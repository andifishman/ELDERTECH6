// ========================================
// UI: Skeleton
// DESCRIPCIÓN: Placeholder de carga (evita saltos de layout).
// ========================================
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
