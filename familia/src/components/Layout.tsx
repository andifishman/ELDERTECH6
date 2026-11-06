import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Camera, Home, Menu, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/auth/AuthContext';
import { getHilos } from '@/services/familia';
import { nombreCompleto } from '@/lib/format';

const ITEMS = [
  { to: '/', texto: 'Inicio', icono: Home, fin: true },
  { to: '/calendario', texto: 'Calendario', icono: CalendarDays },
  { to: '/fotos', texto: 'Fotos', icono: Camera },
  { to: '/mensajes', texto: 'Mensajes', icono: MessageCircle },
  { to: '/mas', texto: 'Más', icono: Menu },
] as const;

/** Selector de a quién se mira cuando el familiar está vinculado a más de un residente. */
export function SelectorResidente() {
  const { me, residente, elegirResidente } = useAuth();
  if (!me || me.residentes.length < 2) return null;
  return (
    <div className="mb-4">
      <label htmlFor="selector-residente" className="mb-1 block text-sm font-semibold text-soft">Estás viendo a</label>
      <select
        id="selector-residente"
        value={residente?.id ?? ''}
        onChange={(e) => elegirResidente(e.target.value)}
        className="min-h-12 w-full rounded-xl border-2 border-primary-200 bg-white px-3 text-base font-semibold"
      >
        {me.residentes.map((r) => (
          <option key={r.id} value={r.id}>{nombreCompleto(r)}{r.parentesco ? ` (${r.parentesco})` : ''}</option>
        ))}
      </select>
    </div>
  );
}

export function Layout() {
  const { me } = useAuth();
  // El número de la pestaña Mensajes se actualiza solo cada tanto.
  const hilosQ = useQuery({ queryKey: ['hilos'], queryFn: getHilos, refetchInterval: 30_000, refetchIntervalInBackground: false });
  const sinLeer = (hilosQ.data ?? []).reduce((s, h) => s + h.sinLeer, 0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Ir al contenido</a>
      <div className="bg-primary-600 px-4 py-3 text-white">
        <p className="text-lg font-bold">ElderTech · Familias</p>
        {me?.institucion && <p className="text-sm opacity-90">{me.institucion.nombre}</p>}
      </div>
      <main id="contenido" className="flex-1 px-4 pb-28 pt-5">
        <Outlet />
      </main>
      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-primary-100 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-2xl">
          {ITEMS.map(({ to, texto, icono: Icono, ...resto }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={'fin' in resto}
                className={({ isActive }) => clsx('relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-2 text-sm font-semibold', isActive ? 'text-primary-700' : 'text-soft')}
              >
                {({ isActive }) => (
                  <>
                    <span className={clsx('flex h-8 w-14 items-center justify-center rounded-full', isActive && 'bg-primary-100')}>
                      <Icono className="h-6 w-6" aria-hidden />
                    </span>
                    <span>{texto}</span>
                    {to === '/mensajes' && sinLeer > 0 && (
                      <span className="absolute right-[18%] top-1 min-w-6 rounded-full bg-red-700 px-1.5 text-center text-xs font-bold text-white" aria-label={`${sinLeer} mensajes sin leer`}>{sinLeer > 99 ? '99+' : sinLeer}</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
