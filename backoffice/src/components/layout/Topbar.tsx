import { useEffect, useState } from 'react';
import { Menu, Search, Bell, ChevronDown, LogOut, Sun, Moon, Calendar, GraduationCap, Users, Pencil, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { SearchModal } from '@/components/common/SearchModal';
import { useQuery } from '@tanstack/react-query';
import { supabase, ORG_ID } from '@/lib/supabase';
import type { AuditLog } from '@/types/backoffice.types';

const ACCION_ICONO: Record<string, React.ReactNode> = {
  crear: <Plus className="h-3.5 w-3.5 text-primary" />,
  publicar: <Plus className="h-3.5 w-3.5 text-primary" />,
  editar: <Pencil className="h-3.5 w-3.5 text-amber-500" />,
  eliminar: <span className="h-3.5 w-3.5 text-destructive text-xs font-bold">✕</span>,
  pausar: <span className="h-3.5 w-3.5 text-amber-500 text-xs font-bold">⏸</span>,
  reactivar: <span className="h-3.5 w-3.5 text-primary text-xs font-bold">▶</span>,
};

const TABLA_ICONO: Record<string, React.ReactNode> = {
  actividades: <Calendar className="h-3.5 w-3.5" />,
  tutoriales: <GraduationCap className="h-3.5 w-3.5" />,
  residentes: <Users className="h-3.5 w-3.5" />,
};

function useNotificaciones() {
  return useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`organizacion_id.is.null,organizacion_id.eq.${ORG_ID}`)
        .order('created_at', { ascending: false })
        .limit(8);
      return (data ?? []) as AuditLog[];
    },
    refetchInterval: 30000,
  });
}

interface TopbarProps {
  titulo: string;
  subtitulo?: string;
  onAbrirMenu: () => void;
}

export function Topbar({ titulo, subtitulo, onAbrirMenu }: TopbarProps) {
  const { perfil, signOut } = useAuth();
  const { tema, alternar } = useTema();
  const [searchAbierto, setSearchAbierto] = useState(false);
  const [notifVistas, setNotifVistas] = useState<string | null>(null);
  const notif = useNotificaciones();

  // Ctrl+K para abrir búsqueda
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchAbierto(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const logs = notif.data ?? [];
  const ultimaVista = notifVistas;
  const noVistas = logs.filter((l) => !ultimaVista || l.created_at > ultimaVista).length;

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md sm:px-6">
        <button
          onClick={onAbrirMenu}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">{titulo}</h1>
          {subtitulo && <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>}
        </div>

        {/* Buscador */}
        <button
          onClick={() => setSearchAbierto(true)}
          className="relative hidden cursor-text items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-ring md:flex"
          style={{ width: '220px' }}
          aria-label="Buscar"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">⌃K</kbd>
        </button>

        {/* Modo oscuro */}
        <button
          onClick={alternar}
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {tema === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notificaciones */}
        <DropdownMenu onOpenChange={(open) => {
          if (open && logs.length > 0) setNotifVistas(logs[0].created_at);
        }}>
          <DropdownMenuTrigger className="relative rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Notificaciones">
            <Bell className="h-5 w-5" />
            {noVistas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {noVistas > 9 ? '9+' : noVistas}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="text-sm font-semibold">Actividad reciente</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {logs.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sin actividad reciente</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-accent">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    {TABLA_ICONO[log.tabla_afectada] ?? ACCION_ICONO[log.accion] ?? <Bell className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{log.descripcion ?? `${log.accion} en ${log.tabla_afectada}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.usuario_nombre && <span className="font-medium">{log.usuario_nombre} · </span>}
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Usuario */}
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
            <DropdownMenuItem onClick={() => void signOut()} className="cursor-pointer text-destructive">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <SearchModal abierto={searchAbierto} onCerrar={() => setSearchAbierto(false)} />
    </>
  );
}
