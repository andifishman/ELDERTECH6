// ========================================
// CONFIG: Navegación del Sidebar
// DESCRIPCIÓN:
// Define los ítems del menú lateral, su ícono, ruta y el módulo
// cuyo permiso "ver" hace falta para mostrarlos. Los módulos
// "accesos" y "administradores" son solo del Super Super Admin.
// ========================================
import {
  LayoutDashboard,
  CalendarClock,
  GraduationCap,
  Users,
  Bot,
  History,
  ShieldCheck,
  KeyRound,
  Inbox,
  Bell,
  Users2,
  Gamepad2,
  Newspaper,
  type LucideIcon,
} from 'lucide-react';
import type { ModuloId } from '@/types/backoffice.types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  modulo: ModuloId;
}

// Horarios: hoy se muestran los del Hogar (feed externo). La gestión propia (/horarios) sigue completa
// y funcionando — solo está oculta del menú — para ofrecérsela a geriátricos sin sistema propio.
// Para volver a usarla: poner esto en false.
const HORARIOS_DEL_HOGAR = true;

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, modulo: 'dashboard' },
  { label: 'Actividades', to: HORARIOS_DEL_HOGAR ? '/horarios-hogar' : '/horarios', icon: CalendarClock, modulo: 'horarios' },
  { label: 'Tutoriales', to: '/tutoriales', icon: GraduationCap, modulo: 'tutoriales' },
  { label: 'Usuarios', to: '/usuarios', icon: Users, modulo: 'usuarios' },
  { label: 'Grupos', to: '/grupos', icon: Users2, modulo: 'grupos' },
  { label: 'Juegos', to: '/juegos', icon: Gamepad2, modulo: 'juegos' },
  { label: 'Pedidos y Sugerencias', to: '/pedidos', icon: Inbox, modulo: 'pedidos' },
  { label: 'Novedades', to: '/novedades', icon: Newspaper, modulo: 'novedades' },
  { label: 'Notificaciones', to: '/notificaciones', icon: Bell, modulo: 'notificaciones' },
  { label: 'Asistente / FAQ', to: '/asistente', icon: Bot, modulo: 'asistente' },
  { label: 'Auditoría', to: '/auditoria', icon: History, modulo: 'auditoria' },
  { label: 'Administradores', to: '/administradores', icon: ShieldCheck, modulo: 'administradores' },
  { label: 'Accesos', to: '/accesos', icon: KeyRound, modulo: 'accesos' },
];
