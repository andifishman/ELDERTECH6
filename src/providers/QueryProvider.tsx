//configura react-query con caché PERSISTENTE en AsyncStorage:
//los datos de Supabase se muestran al instante desde el disco (aunque la app
//se haya cerrado) y se refrescan en background cuando están viejos.
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

//instancia global del cliente de react-query con opciones por defecto
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      // gcTime debe ser >= maxAge del persister para que el caché sobreviva en disco
      gcTime: 24 * 60 * 60 * 1000,
      networkMode: 'always', // React Native: navigator.onLine is unreliable, never pause queries
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'eldertech_rq_cache',
  throttleTime: 2000, // no escribir a disco más de una vez cada 2s
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Refrescar queries obsoletas cuando la app vuelve al primer plano
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // descartar caché de más de 24h
        // Cambiar el buster invalida todo el caché persistido (ante cambios de shape)
        buster: 'v1',
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
