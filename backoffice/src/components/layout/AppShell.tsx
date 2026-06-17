// ========================================
// COMPONENTE: AppShell
// DESCRIPCIÓN:
// Layout principal del backoffice: sidebar fija +
// topbar + área de contenido (Outlet). El título de la
// topbar se toma del `handle` de la ruta activa.
// ========================================
import { Suspense, useState } from 'react';
import { Outlet, useMatches } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LoadingState } from '@/components/common/states';

interface RouteHandle {
  titulo?: string;
  subtitulo?: string;
}

export function AppShell() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const matches = useMatches();

  // tomamos el handle de la ruta más profunda que defina título
  const handle = [...matches].reverse().find((m) => (m.handle as RouteHandle)?.titulo)?.handle as
    | RouteHandle
    | undefined;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          titulo={handle?.titulo ?? 'ElderTech'}
          subtitulo={handle?.subtitulo}
          onAbrirMenu={() => setMenuAbierto(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
