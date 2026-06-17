// ========================================
// CONFIG: Navegación del Sidebar
// DESCRIPCIÓN:
// Define los ítems del menú lateral, su ícono, ruta y
// el permiso requerido para verlos.
// ========================================
import {
  LayoutDashboard,
  CalendarClock,
  GraduationCap,
  Users,
  Bot,
  Settings,
  History,
  type LucideIcon,
} from 'lucide-react';
import type { Permisos } from '@/types/backoffice.types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  // función que decide si el ítem es visible según los permisos
  visible?: (p: Permisos) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Horarios', to: '/horarios', icon: CalendarClock },
  { label: 'Tutoriales', to: '/tutoriales', icon: GraduationCap },
  { label: 'Usuarios', to: '/usuarios', icon: Users, visible: (p) => p.puedeGestionarUsuarios },
  { label: 'Asistente / FAQ', to: '/asistente', icon: Bot },
  { label: 'Auditoría', to: '/auditoria', icon: History, visible: (p) => p.puedeGestionarUsuarios },
  { label: 'Configuración', to: '/configuracion', icon: Settings, visible: (p) => p.puedeConfigurar },
];
