// ========================================
// COMPONENTE: NotFoundPage
// DESCRIPCIÓN: Pantalla 404 dentro del shell. Mate se perdió: dice claro qué
// pasó, no culpa a nadie y ofrece salidas (inicio y volver atrás).
// La versión sin la app (cuando el servidor no encuentra un archivo) es
// `public/404.html`, con el mismo diseño.
// ========================================
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Mate } from '@/components/common/Mate';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-border bg-card px-6 py-12 text-center shadow-sm">
      <div aria-hidden="true" className="flex items-center justify-center gap-1 leading-none sm:gap-3">
        <span className="select-none text-[110px] font-black tracking-tighter text-primary drop-shadow-[0_5px_0_hsl(var(--primary)/0.25)] sm:text-[150px]">4</span>
        <Mate estado="perdido" animado className="h-[110px] w-[88px] sm:h-[150px] sm:w-[120px]" />
        <span className="select-none text-[110px] font-black tracking-tighter text-primary drop-shadow-[0_5px_0_hsl(var(--primary)/0.25)] sm:text-[150px]">4</span>
      </div>
      <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">¡Ups! Esta página se fue a tomar unos mates</h1>
      <p className="mt-2 max-w-md text-base text-muted-foreground">
        No encontramos lo que buscabas. No es culpa tuya: puede que el enlace esté viejo o que la sección ya no exista.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/">
            <Home className="h-4 w-4" /> Ir al inicio
          </Link>
        </Button>
        <Button variant="outline" size="lg" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
          <ArrowLeft className="h-4 w-4" /> Volver atrás
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Error 404 · página no encontrada</p>
    </div>
  );
}
