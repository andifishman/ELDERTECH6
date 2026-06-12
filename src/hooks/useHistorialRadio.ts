//guarda y recupera el historial de las últimas 10 radios escuchadas en AsyncStorage

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'eldertech_radio_historial';
const MAX_HISTORIAL = 10;

export function useHistorialRadio() {
  //lista de ids de radios escuchadas, la más reciente primero
  const [historial, setHistorial] = useState<string[]>([]);

  //carga el historial desde AsyncStorage al montar el hook
  useEffect(() => {
    cargarHistorial();
  }, []);

  //lee el historial guardado en AsyncStorage y actualiza el estado
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
      //si ya estaba en el historial la saca para moverla al frente
      const sinDuplicado = prev.filter((id) => id !== radioId);
      //agrega al principio y recorta al máximo permitido
      const nuevos = [radioId, ...sinDuplicado].slice(0, MAX_HISTORIAL);

      // Persistir en background
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nuevos)).catch((err) =>
        console.warn('[useHistorialRadio] Error al guardar:', err),
      );

      return nuevos;
    });
  }, []);

  //borra todo el historial del estado y de AsyncStorage
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
