import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Camera, Home, Menu, MessageCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/auth/AuthContext';
import { getHilos } from '@/services/familia';
import { nombreCompleto } from '@/lib/format';

// Cada sección tiene su color: así se sabe de un vistazo dónde se está.
const ITEMS = [
  { to: '/', texto: 'Inicio', icono: Home, fin: true, activo: 'bg-primary-600 text-white', suave: 'text-primary-600', aro: 'text-primary-700' },
  { to: '/calendario', texto: 'Calendario', icono: CalendarDays, activo: 'bg-sol-400 text-sol-900', suave: 'text-sol-700', aro: 'text-sol-700' },
  { to: '/fotos', texto: 'Fotos', icono: Camera, activo: 'bg-agua-500 text-white', suave: 'text-agua-700', aro: 'text-agua-700' },
  { to: '/mensajes', texto: 'Mensajes', icono: MessageCircle, activo: 'bg-coral-600 text-white', suave: 'text-coral-600', aro: 'text-coral-700' },
  { to: '/mas', texto: 'Más', icono: Menu, activo: 'bg-rosa-500 text-white', suave: 'text-rosa-700', aro: 'text-rosa-700' },
] as const;

/** Selector de a quién se mira cuando el familiar está vinculado a más de un residente. */
export function SelectorResidente() {
  const { me, residente, elegirResidente } = useAuth();
  if (!me || me.residentes.length < 2) return null;
  return (
    <div className="mb-4">
      <label htmlFor="selector-residente" className="mb-1 block text-sm font-bold text-soft">Estás viendo a</label>
      <select
        id="selector-residente"
        value={residente?.id ?? ''}
        onChange={(e) => elegirResidente(e.target.value)}
        className="min-h-12 w-full rounded-2xl border-2 border-primary-200 bg-white px-3 text-base font-bold shadow-suave"
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

      <header className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-4 pb-5 pt-4 text-white shadow-suave">
        {/* Formas decorativas: dan calidez sin competir con el contenido */}
        <span aria-hidden className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-sol-400/90" />
        <span aria-hidden className="absolute right-16 top-9 h-9 w-9 rounded-full bg-coral-400/90" />
        <span aria-hidden className="absolute -bottom-6 right-2 h-16 w-16 rounded-full bg-agua-500/70" />
        <div className="relative flex items-center gap-3">
          <img src="/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 rounded-2xl bg-white p-0.5 shadow" />
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight">ElderTech · Familias</p>
            {me?.institucion && <p className="truncate text-sm font-semibold text-white/90">{me.institucion.nombre}</p>}
          </div>
        </div>
      </header>

      <main id="contenido" className="flex-1 px-4 pb-32 pt-5">
        <Outlet />
      </main>

      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <ul className="mx-auto flex max-w-2xl rounded-[1.75rem] border border-primary-100 bg-white/95 p-1.5 shadow-[0_-6px_30px_-10px_rgba(95,62,136,0.4)] backdrop-blur">
          {ITEMS.map(({ to, texto, icono: Icono, activo, suave, aro, ...resto }) => (
            <li key={to} className="flex-1">
              <NavLink to={to} end={'fin' in resto} className="relative flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-sm font-bold">
                {({ isActive }) => (
                  <>
                    <span className={clsx('flex h-9 w-14 items-center justify-center rounded-full transition-all', isActive ? activo : suave)}>
                      <Icono className="h-6 w-6" aria-hidden strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    <span className={isActive ? aro : 'text-soft'}>{texto}</span>
                    {to === '/mensajes' && sinLeer > 0 && (
                      <span className="absolute right-[16%] top-0.5 min-w-6 rounded-full bg-rosa-500 px-1.5 text-center text-xs font-extrabold text-white ring-2 ring-white" aria-label={`${sinLeer} mensajes sin leer`}>{sinLeer > 99 ? '99+' : sinLeer}</span>
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
