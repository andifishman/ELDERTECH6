// ========================================
// COMPONENTE: Sidebar
// DESCRIPCIÓN:
// Barra lateral de navegación con identidad ElderTech
// (verde de marca). Muestra logo, perfil del admin, los
// ítems de menú filtrados por permisos y el botón de
// cerrar sesión. Colapsable en mobile.
// ========================================
import { NavLink } from 'react-router-dom';
import { Leaf, LogOut, X } from 'lucide-react';
import { cn, iniciales } from '@/lib/utils';
import { NAV_ITEMS } from './nav.config';
import { usePermisos } from '@/hooks/usePermisos';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarProps {
  abierto: boolean;
  onCerrar: () => void;
}

const ROL_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  editor: 'Editor',
};

export function Sidebar({ abierto, onCerrar }: SidebarProps) {
  const permisos = usePermisos();
  const { perfil, rol, signOut } = useAuth();
  const items = NAV_ITEMS.filter((i) => !i.visible || i.visible(permisos));

  return (
    <>
      {/* overlay en mobile */}
      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary-600 text-white transition-transform duration-200 lg:static lg:translate-x-0',
          abierto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* logo */}
        <div className="flex h-16 items-center justify-between gap-2 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">ElderTech</p>
              <p className="text-[11px] font-medium text-white/70">Backoffice</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-md p-1 hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* perfil del admin */}
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-white/10 p-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/20">
            {perfil?.avatar_url && <AvatarImage src={perfil.avatar_url} alt="" />}
            <AvatarFallback className="bg-white/20 text-white">
              {iniciales(perfil?.nombre_completo)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{perfil?.nombre_completo ?? 'Administrador'}</p>
            <p className="text-xs text-white/70">{ROL_LABEL[rol] ?? 'Editor'}</p>
          </div>
        </div>

        {/* navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onCerrar}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-white text-primary-700 shadow-sm' : 'text-white/85 hover:bg-white/10',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* cerrar sesión */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
