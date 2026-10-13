import { useState } from 'react';
import { Menu, Bell, Sun, Moon, Calendar, GraduationCap, Users, Pencil, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTema } from '@/hooks/useTema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
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
    queryFn: () => apiClient.get<AuditLog[]>('/api/admin/audit?limit=8'),
    refetchInterval: 30000,
  });
}

interface TopbarProps {
  titulo: string;
  subtitulo?: string;
  onAbrirMenu: () => void;
}

export function Topbar({ titulo, subtitulo, onAbrirMenu }: TopbarProps) {
  const { tema, alternar } = useTema();
  const [notifVistas, setNotifVistas] = useState<string | null>(() => {
    try { return localStorage.getItem('backoffice_notif_vista'); } catch { return null; }
  });
  const [limpiadoEn, setLimpiadoEn] = useState<string | null>(() => {
    try { return localStorage.getItem('backoffice_notif_limpiado'); } catch { return null; }
  });
  const notif = useNotificaciones();

  const logs = notif.data ?? [];
  // Solo mostrar logs posteriores al último limpiado
  const logsVisibles = logs.filter((l) => !limpiadoEn || l.created_at > limpiadoEn);
  // Badge: logs visibles que no fueron vistos aún
  const umbral = limpiadoEn && notifVistas
    ? (limpiadoEn > notifVistas ? limpiadoEn : notifVistas)
    : (limpiadoEn ?? notifVistas);
  const noVistas = logsVisibles.filter((l) => !umbral || l.created_at > umbral).length;

  const limpiarNotificaciones = () => {
    const ahora = new Date().toISOString();
    setLimpiadoEn(ahora);
    setNotifVistas(ahora);
    try {
      localStorage.setItem('backoffice_notif_limpiado', ahora);
      localStorage.setItem('backoffice_notif_vista', ahora);
    } catch {}
  };

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

        {/* Separador */}
        <div className="hidden h-8 w-px bg-border sm:block" />

        {/* Grupo de acciones */}
        <div className="flex items-center gap-1">

          {/* Tema */}
          <button
            onClick={alternar}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3"
            aria-label={tema === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {tema === 'dark' ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
            <span className="hidden sm:block">Tema</span>
          </button>

          {/* Alertas */}
          <DropdownMenu onOpenChange={(open) => {
            if (open && logsVisibles.length > 0) {
              const ts = logsVisibles[0].created_at;
              setNotifVistas(ts);
              try { localStorage.setItem('backoffice_notif_vista', ts); } catch {}
            }
          }}>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3"
              aria-label="Notificaciones"
            >
              <span className="relative shrink-0">
                <Bell className="h-5 w-5" />
                {noVistas > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {noVistas > 9 ? '9+' : noVistas}
                  </span>
                )}
              </span>
              <span className="hidden sm:block">Alertas</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold">Actividad reciente</span>
                {logsVisibles.length > 0 && (
                  <button
                    onClick={limpiarNotificaciones}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {logsVisibles.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sin actividad reciente</p>
              ) : (
                logsVisibles.map((log) => (
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
        </div>
      </header>
    </>
  );
}
