// ========================================
// COMPONENTE: NotFoundPage
// DESCRIPCIÓN: Pantalla 404 dentro del shell del backoffice. Dice qué pasó,
// muestra la dirección que se pidió y ofrece salidas (volver atrás / inicio).
// La versión sin la app (cuando el servidor no encuentra un archivo) es
// `backoffice/public/404.html`, con el mismo texto.
// ========================================
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="ElderTech" className="h-16 w-16 rounded-2xl border border-border bg-white object-contain p-1.5" />
      <p aria-hidden="true" className="mt-5 text-8xl font-black leading-none tracking-tighter text-primary sm:text-9xl">404</p>
      <h1 className="mt-3 text-2xl font-extrabold text-foreground">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-base text-muted-foreground">La dirección que abriste no existe o cambió de lugar.</p>
      <ul className="mt-4 space-y-1.5 text-left text-sm text-muted-foreground">
        <li>› Volvé a la página anterior.</li>
        <li>› Revisá que el enlace esté bien escrito.</li>
        <li>› Si lo tenías guardado, puede estar desactualizado: entrá desde el inicio.</li>
      </ul>
      <code className="mt-4 max-w-full break-all rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">{pathname}{search}</code>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
          <ArrowLeft className="h-4 w-4" /> Volver atrás
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/">
            <Home className="h-4 w-4" /> Ir al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
}
