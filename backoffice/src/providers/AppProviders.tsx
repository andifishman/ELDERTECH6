// ========================================
// PROVIDER: AppProviders
// DESCRIPCIÓN:
// Compone todos los providers globales: React Query,
// autenticación y el Toaster de notificaciones.
// ========================================
import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth/AuthContext';
import { Toaster } from '@/components/ui/toast';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
