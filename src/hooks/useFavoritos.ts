/**
 * useFavoritos.ts
 * ───────────────
 * Gestiona las radios favoritas del usuario usando AsyncStorage.
 * Key: 'eldertech_radio_favoritos'
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'eldertech_radio_favoritos';

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  // Cargar favoritos al montar
  useEffect(() => {
    cargarFavoritos();
  }, []);

  async function cargarFavoritos() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        setFavoritos(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.warn('[useFavoritos] Error al cargar:', err);
    } finally {
      setCargando(false);
    }
  }

  const toggleFavorito = useCallback(async (radioId: string) => {
    setFavoritos((prev) => {
      const esFav = prev.includes(radioId);
      const nuevos = esFav
        ? prev.filter((id) => id !== radioId)
        : [...prev, radioId];

      // Persistir en background
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos)).catch((err) =>
        console.warn('[useFavoritos] Error al guardar:', err),
      );

      return nuevos;
    });
  }, []);

  const esFavorito = useCallback(
    (radioId: string) => favoritos.includes(radioId),
    [favoritos],
  );

  return { favoritos, toggleFavorito, esFavorito, cargando };
}
