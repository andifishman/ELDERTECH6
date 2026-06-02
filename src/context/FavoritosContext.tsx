/**
 * FavoritosContext.tsx
 * ─────────────────────
 * Estado global de radios favoritas.
 * Al ser un contexto compartido, cualquier pantalla que llame
 * toggleFavorito actualiza inmediatamente la lista en todas las
 * pantallas (index, detalle, etc.).
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'eldertech_radio_favoritos';

interface FavoritosContextValue {
  favoritos: string[];
  cargando: boolean;
  toggleFavorito: (radioId: string) => void;
  esFavorito: (radioId: string) => boolean;
}

const FavoritosContext = createContext<FavoritosContextValue | null>(null);

export function FavoritosProvider({ children }: { children: React.ReactNode }) {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  // Cargar desde AsyncStorage al montar
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          setFavoritos(Array.isArray(parsed) ? parsed : []);
        }
      })
      .catch((err) => console.warn('[Favoritos] Error al cargar:', err))
      .finally(() => setCargando(false));
  }, []);

  const toggleFavorito = useCallback((radioId: string) => {
    setFavoritos((prev) => {
      const esFav = prev.includes(radioId);
      const nuevos = esFav
        ? prev.filter((id) => id !== radioId)
        : [radioId, ...prev]; // nuevo favorito va al inicio

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos)).catch((err) =>
        console.warn('[Favoritos] Error al guardar:', err),
      );

      return nuevos;
    });
  }, []);

  const esFavorito = useCallback(
    (radioId: string) => favoritos.includes(radioId),
    [favoritos],
  );

  return (
    <FavoritosContext.Provider value={{ favoritos, cargando, toggleFavorito, esFavorito }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritosContext(): FavoritosContextValue {
  const ctx = useContext(FavoritosContext);
  if (!ctx) throw new Error('useFavoritosContext debe usarse dentro de FavoritosProvider');
  return ctx;
}
