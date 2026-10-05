// ========================================
// COMPONENTE: App (Router)
// DESCRIPCIÓN:
// Define todas las rutas del backoffice. Las rutas
// privadas se envuelven con ProtectedRoute y el AppShell
// (sidebar + topbar). El `handle` de cada ruta define el
// título que muestra la topbar.
// ========================================
import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/providers/AppProviders';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { Inicio, RequireModulo } from '@/features/auth/RequireModulo';
import { LoginPage } from '@/features/auth/LoginPage';
import { RecuperarContrasenaPage } from '@/features/auth/RecuperarContrasenaPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { NotFoundPage } from '@/components/common/NotFoundPage';

// Carga diferida por ruta: cada módulo se descarga solo al visitarlo.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const HorariosPage = lazy(() => import('@/features/horarios/HorariosPage').then((m) => ({ default: m.HorariosPage })));
const ActividadFormPage = lazy(() => import('@/features/horarios/ActividadFormPage').then((m) => ({ default: m.ActividadFormPage })));
const TutorialesPage = lazy(() => import('@/features/tutoriales/TutorialesPage').then((m) => ({ default: m.TutorialesPage })));
const ArticuloFormPage = lazy(() => import('@/features/tutoriales/ArticuloFormPage').then((m) => ({ default: m.ArticuloFormPage })));
const TutorialesVistosPage = lazy(() => import('@/features/tutoriales/TutorialesVistosPage').then((m) => ({ default: m.TutorialesVistosPage })));
const UsuariosPage = lazy(() => import('@/features/usuarios/UsuariosPage').then((m) => ({ default: m.UsuariosPage })));
const ResidenteDetailPage = lazy(() => import('@/features/usuarios/ResidenteDetailPage').then((m) => ({ default: m.ResidenteDetailPage })));
const AsistentePage = lazy(() => import('@/features/asistente/AsistentePage').then((m) => ({ default: m.AsistentePage })));
const AuditoriaPage = lazy(() => import('@/features/auditoria/AuditoriaPage').then((m) => ({ default: m.AuditoriaPage })));
const ConfiguracionPage = lazy(() => import('@/features/configuracion/ConfiguracionPage').then((m) => ({ default: m.ConfiguracionPage })));
const AdministradoresPage = lazy(() => import('@/features/administradores/AdministradoresPage').then((m) => ({ default: m.AdministradoresPage })));
const PedidosPage = lazy(() => import('@/features/pedidos/PedidosPage').then((m) => ({ default: m.PedidosPage })));
const PedidoDetailPage = lazy(() => import('@/features/pedidos/PedidoDetailPage').then((m) => ({ default: m.PedidoDetailPage })));
const AccesosPage = lazy(() => import('@/features/accesos/AccesosPage').then((m) => ({ default: m.AccesosPage })));
const GruposPage = lazy(() => import('@/features/grupos/GruposPage').then((m) => ({ default: m.GruposPage })));
const GrupoFormPage = lazy(() => import('@/features/grupos/GrupoFormPage').then((m) => ({ default: m.GrupoFormPage })));
const GrupoDetailPage = lazy(() => import('@/features/grupos/GrupoDetailPage').then((m) => ({ default: m.GrupoDetailPage })));
const NotificacionesPage = lazy(() => import('@/features/notificaciones/NotificacionesPage').then((m) => ({ default: m.NotificacionesPage })));
const NotificacionFormPage = lazy(() => import('@/features/notificaciones/NotificacionFormPage').then((m) => ({ default: m.NotificacionFormPage })));
const NotificacionDetailPage = lazy(() => import('@/features/notificaciones/NotificacionDetailPage').then((m) => ({ default: m.NotificacionDetailPage })));

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/recuperar-contrasena', element: <RecuperarContrasenaPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Inicio><DashboardPage /></Inicio>, handle: { titulo: 'Dashboard', subtitulo: 'Resumen general · ElderTech Backoffice' } },
          { path: '/horarios', element: <RequireModulo modulo="horarios"><HorariosPage /></RequireModulo>, handle: { titulo: 'Horarios' } },
          { path: '/horarios/nueva', element: <RequireModulo modulo="horarios" accion="crear"><ActividadFormPage /></RequireModulo>, handle: { titulo: 'Nueva actividad' } },
          { path: '/horarios/:id/editar', element: <RequireModulo modulo="horarios" accion="editar"><ActividadFormPage /></RequireModulo>, handle: { titulo: 'Editar actividad' } },
          { path: '/tutoriales', element: <RequireModulo modulo="tutoriales"><TutorialesPage /></RequireModulo>, handle: { titulo: 'Tutoriales' } },
          { path: '/tutoriales/nuevo', element: <RequireModulo modulo="tutoriales" accion="crear"><ArticuloFormPage /></RequireModulo>, handle: { titulo: 'Nuevo contenido' } },
          { path: '/tutoriales/vistos', element: <RequireModulo modulo="tutoriales"><TutorialesVistosPage /></RequireModulo>, handle: { titulo: 'Tutoriales vistos' } },
          { path: '/tutoriales/:id/editar', element: <RequireModulo modulo="tutoriales" accion="editar"><ArticuloFormPage /></RequireModulo>, handle: { titulo: 'Editar contenido' } },
          { path: '/usuarios', element: <RequireModulo modulo="usuarios"><UsuariosPage /></RequireModulo>, handle: { titulo: 'Usuarios' } },
          { path: '/usuarios/:id', element: <RequireModulo modulo="usuarios"><ResidenteDetailPage /></RequireModulo>, handle: { titulo: 'Perfil del residente' } },
          { path: '/grupos', element: <RequireModulo modulo="grupos"><GruposPage /></RequireModulo>, handle: { titulo: 'Grupos' } },
          { path: '/grupos/nuevo', element: <RequireModulo modulo="grupos" accion="crear"><GrupoFormPage /></RequireModulo>, handle: { titulo: 'Nuevo grupo' } },
          { path: '/grupos/:id', element: <RequireModulo modulo="grupos"><GrupoDetailPage /></RequireModulo>, handle: { titulo: 'Detalle de grupo' } },
          { path: '/asistente', element: <RequireModulo modulo="asistente"><AsistentePage /></RequireModulo>, handle: { titulo: 'Asistente / FAQ' } },
          { path: '/auditoria', element: <RequireModulo modulo="auditoria"><AuditoriaPage /></RequireModulo>, handle: { titulo: 'Auditoría' } },
          { path: '/configuracion', element: <RequireModulo modulo="configuracion"><ConfiguracionPage /></RequireModulo>, handle: { titulo: 'Configuración' } },
          { path: '/administradores', element: <RequireModulo modulo="administradores"><AdministradoresPage /></RequireModulo>, handle: { titulo: 'Administradores' } },
          { path: '/accesos', element: <RequireModulo modulo="accesos"><AccesosPage /></RequireModulo>, handle: { titulo: 'Accesos', subtitulo: 'Permisos de cada usuario por módulo' } },
          { path: '/pedidos', element: <RequireModulo modulo="pedidos"><PedidosPage /></RequireModulo>, handle: { titulo: 'Pedidos y Sugerencias' } },
          { path: '/pedidos/:id', element: <RequireModulo modulo="pedidos"><PedidoDetailPage /></RequireModulo>, handle: { titulo: 'Detalle de solicitud' } },
          { path: '/notificaciones', element: <RequireModulo modulo="notificaciones"><NotificacionesPage /></RequireModulo>, handle: { titulo: 'Notificaciones' } },
          { path: '/notificaciones/nueva', element: <RequireModulo modulo="notificaciones" accion="crear"><NotificacionFormPage /></RequireModulo>, handle: { titulo: 'Nueva notificación' } },
          { path: '/notificaciones/:id', element: <RequireModulo modulo="notificaciones"><NotificacionDetailPage /></RequireModulo>, handle: { titulo: 'Detalle de notificación' } },
          { path: '/notificaciones/:id/editar', element: <RequireModulo modulo="notificaciones" accion="editar"><NotificacionFormPage /></RequireModulo>, handle: { titulo: 'Editar notificación' } },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
