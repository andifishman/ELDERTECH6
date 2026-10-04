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
  Settings,
  History,
  ShieldCheck,
  KeyRound,
  Inbox,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import type { ModuloId } from '@/types/backoffice.types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  modulo: ModuloId;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, modulo: 'dashboard' },
  { label: 'Horarios', to: '/horarios', icon: CalendarClock, modulo: 'horarios' },
  { label: 'Tutoriales', to: '/tutoriales', icon: GraduationCap, modulo: 'tutoriales' },
  { label: 'Usuarios', to: '/usuarios', icon: Users, modulo: 'usuarios' },
  { label: 'Pedidos y Sugerencias', to: '/pedidos', icon: Inbox, modulo: 'pedidos' },
  { label: 'Notificaciones', to: '/notificaciones', icon: Bell, modulo: 'notificaciones' },
  { label: 'Asistente / FAQ', to: '/asistente', icon: Bot, modulo: 'asistente' },
  { label: 'Auditoría', to: '/auditoria', icon: History, modulo: 'auditoria' },
  { label: 'Configuración', to: '/configuracion', icon: Settings, modulo: 'configuracion' },
  { label: 'Administradores', to: '/administradores', icon: ShieldCheck, modulo: 'administradores' },
  { label: 'Accesos', to: '/accesos', icon: KeyRound, modulo: 'accesos' },
];
