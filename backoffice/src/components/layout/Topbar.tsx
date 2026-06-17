// ========================================
// COMPONENTE: Topbar
// DESCRIPCIÓN:
// Barra superior con título de la página, buscador,
// indicador de tiempo real, notificaciones y menú de
// usuario. Incluye el botón hamburguesa para mobile.
// ========================================
import { Menu, Search, Bell, ChevronDown, LogOut, Sun, Moon } from 'lucide-react';
import { iniciales } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { useTema } from '@/hooks/useTema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopbarProps {
  titulo: string;
  subtitulo?: string;
  onAbrirMenu: () => void;
}

export function Topbar({ titulo, subtitulo, onAbrirMenu }: TopbarProps) {
  const { perfil, signOut } = useAuth();
  const { tema, alternar } = useTema();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onAbrirMenu}
        className="rounded-md p-2 hover:bg-accent lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">{titulo}</h1>
        {subtitulo && <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>}
      </div>

      {/* buscador (decorativo en esta fase, listo para conectar) */}
      <div className="relative hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar…"
          aria-label="Buscar"
          className="h-10 w-56 rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        onClick={alternar}
        className="rounded-full p-2 hover:bg-accent"
        aria-label={tema === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      >
        {tema === 'dark' ? (
          <Sun className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Moon className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <button className="relative rounded-full p-2 hover:bg-accent" aria-label="Notificaciones">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-accent">
          <Avatar className="h-9 w-9">
            {perfil?.avatar_url && <AvatarImage src={perfil.avatar_url} alt="" />}
            <AvatarFallback>{iniciales(perfil?.nombre_completo)}</AvatarFallback>
          </Avatar>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span>{perfil?.nombre_completo ?? 'Administrador'}</span>
            <span className="text-xs font-normal text-muted-foreground">{perfil?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
