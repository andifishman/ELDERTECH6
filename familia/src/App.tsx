import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { Layout } from '@/components/Layout';
import { Aviso, Boton, Cargando } from '@/components/ui';
import { apiUrlInvalida, ApiError } from '@/lib/apiClient';
import { configurado } from '@/lib/supabase';
import { AlbumPage, FotosPage } from '@/pages/FotosPage';
import { CalendarioPage } from '@/pages/CalendarioPage';
import { ConsultaDetallePage, ConsultasPage, NuevaConsultaPage } from '@/pages/ConsultasPage';
import { InicioPage } from '@/pages/InicioPage';
import { LoginPage } from '@/pages/LoginPage';
import { AvisosPage, DocumentosPage, MasPage, NoticiasPage, PropuestasPage } from '@/pages/MasPage';
import { ChatPage, MensajesPage } from '@/pages/MensajesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Un 4xx (sin acceso, no encontrado) no se reintenta: no se arregla solo.
      retry: (cantidad, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && cantidad < 2,
    },
  },
});

function Pantalla({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5 py-10 text-center">{children}</main>;
}

function Puerta() {
  const { estado, cerrarSesion, reintentar } = useAuth();

  if (!configurado || apiUrlInvalida()) {
    return (
      <Pantalla>
        <h1 className="text-2xl font-bold text-red-800">La aplicación no está configurada</h1>
        <Aviso tipo="error">Falta la dirección del servidor o la configuración de acceso. Avisale a la residencia: es un problema de instalación, no tuyo.</Aviso>
      </Pantalla>
    );
  }
  if (estado === 'cargando') return <Pantalla><Cargando texto="Entrando…" /></Pantalla>;
  if (estado === 'sin-sesion') return <LoginPage />;
  if (estado === 'sin-acceso') {
    return (
      <Pantalla>
        <h1 className="text-2xl font-bold text-primary-800">Esta cuenta no tiene acceso</h1>
        <p>Tu email no está dado de alta como familiar en ninguna residencia, o tu acceso fue deshabilitado. Consultale a la residencia.</p>
        <Boton variante="secundario" bloque onClick={() => void cerrarSesion()}>Cerrar sesión</Boton>
      </Pantalla>
    );
  }
  if (estado === 'error') {
    return (
      <Pantalla>
        <h1 className="text-2xl font-bold text-primary-800">No pudimos entrar</h1>
        <p>Hubo un problema de conexión con el servidor. Revisá tu internet e intentá de nuevo.</p>
        <Boton bloque onClick={reintentar}>Reintentar</Boton>
        <Boton variante="fantasma" bloque onClick={() => void cerrarSesion()}>Cerrar sesión</Boton>
      </Pantalla>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<InicioPage />} />
        <Route path="calendario" element={<CalendarioPage />} />
        <Route path="fotos" element={<FotosPage />} />
        <Route path="fotos/:id" element={<AlbumPage />} />
        <Route path="mensajes" element={<MensajesPage />} />
        <Route path="mensajes/:residenteId" element={<ChatPage />} />
        <Route path="mas" element={<MasPage />} />
        <Route path="avisos" element={<AvisosPage />} />
        <Route path="noticias" element={<NoticiasPage />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="consultas" element={<ConsultasPage />} />
        <Route path="consultas/nueva" element={<NuevaConsultaPage />} />
        <Route path="consultas/:id" element={<ConsultaDetallePage />} />
        <Route path="propuestas" element={<PropuestasPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Puerta />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
