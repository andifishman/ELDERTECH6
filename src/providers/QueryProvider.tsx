//configura react-query para toda la app con caché de 5 minutos y 2 reintentos por defecto
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

//instancia global del cliente de react-query con opciones por defecto
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      networkMode: 'always', // React Native: navigator.onLine is unreliable, never pause queries
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
