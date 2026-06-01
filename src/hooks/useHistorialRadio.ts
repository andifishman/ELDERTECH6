/**
 * useHistorialRadio.ts
 * ────────────────────
 * Guarda las últimas 10 radios escuchadas en AsyncStorage.
 * Key: 'eldertech_radio_historial'
 * Se actualiza llamando a agregarAlHistorial(radioId) al iniciar reproducción.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'eldertech_radio_historial';
const MAX_HISTORIAL = 10;

export function useHistorialRadio() {
  const [historial, setHistorial] = useState<string[]>([]);

  // Cargar historial al montar
  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        setHistorial(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err) {
      console.warn('[useHistorialRadio] Error al cargar:', err);
    }
  }

  /**
   * Agrega una radio al historial.
   * - Si ya existe, la mueve al principio (más reciente).
   * - Mantiene máximo MAX_HISTORIAL entradas.
   */
  const agregarAlHistorial = useCallback(async (radioId: string) => {
    setHistorial((prev) => {
      // Remover si ya existe (para moverla al frente)
      const sinDuplicado = prev.filter((id) => id !== radioId);
      // Agregar al principio y limitar
      const nuevos = [radioId, ...sinDuplicado].slice(0, MAX_HISTORIAL);

      // Persistir en background
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos)).catch((err) =>
        console.warn('[useHistorialRadio] Error al guardar:', err),
      );

      return nuevos;
    });
  }, []);

  const limpiarHistorial = useCallback(async () => {
    setHistorial([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[useHistorialRadio] Error al limpiar:', err);
    }
  }, []);

  return { historial, agregarAlHistorial, limpiarHistorial };
}
