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
import { LoginPage } from '@/features/auth/LoginPage';
import { NotFoundPage } from '@/components/common/NotFoundPage';

// Carga diferida por ruta: cada módulo se descarga solo al visitarlo.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const HorariosPage = lazy(() => import('@/features/horarios/HorariosPage').then((m) => ({ default: m.HorariosPage })));
const ActividadFormPage = lazy(() => import('@/features/horarios/ActividadFormPage').then((m) => ({ default: m.ActividadFormPage })));
const TutorialesPage = lazy(() => import('@/features/tutoriales/TutorialesPage').then((m) => ({ default: m.TutorialesPage })));
const ArticuloFormPage = lazy(() => import('@/features/tutoriales/ArticuloFormPage').then((m) => ({ default: m.ArticuloFormPage })));
const UsuariosPage = lazy(() => import('@/features/usuarios/UsuariosPage').then((m) => ({ default: m.UsuariosPage })));
const AsistentePage = lazy(() => import('@/features/asistente/AsistentePage').then((m) => ({ default: m.AsistentePage })));
const AuditoriaPage = lazy(() => import('@/features/auditoria/AuditoriaPage').then((m) => ({ default: m.AuditoriaPage })));
const ConfiguracionPage = lazy(() => import('@/features/configuracion/ConfiguracionPage').then((m) => ({ default: m.ConfiguracionPage })));

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage />, handle: { titulo: 'Dashboard', subtitulo: 'Resumen general · ElderTech Backoffice' } },
          { path: '/horarios', element: <HorariosPage />, handle: { titulo: 'Horarios' } },
          { path: '/horarios/nueva', element: <ActividadFormPage />, handle: { titulo: 'Nueva actividad' } },
          { path: '/horarios/:id/editar', element: <ActividadFormPage />, handle: { titulo: 'Editar actividad' } },
          { path: '/tutoriales', element: <TutorialesPage />, handle: { titulo: 'Tutoriales' } },
          { path: '/tutoriales/nuevo', element: <ArticuloFormPage />, handle: { titulo: 'Nuevo contenido' } },
          { path: '/tutoriales/:id/editar', element: <ArticuloFormPage />, handle: { titulo: 'Editar contenido' } },
          { path: '/usuarios', element: <UsuariosPage />, handle: { titulo: 'Usuarios' } },
          { path: '/asistente', element: <AsistentePage />, handle: { titulo: 'Asistente / FAQ' } },
          { path: '/auditoria', element: <AuditoriaPage />, handle: { titulo: 'Auditoría' } },
          { path: '/configuracion', element: <ConfiguracionPage />, handle: { titulo: 'Configuración' } },
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
