// Contexto de configuración del Asistente — velocidad de voz y tamaño de texto
// Persiste en AsyncStorage: para adultos mayores, perder la config en cada
// apertura de la app es una regresión de accesibilidad real.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConfigVoz } from '@/types/asistente.types';

const STORAGE_KEY = 'eldertech_asistente_config_v1';

interface AsistenteConfigContextValue {
  config: ConfigVoz;
  setVelocidad: (v: ConfigVoz['velocidad']) => void;
  setTamanoTexto: (t: ConfigVoz['tamanoTexto']) => void;
  toggleLeerRespuestas: () => void;
}

const defaultConfig: ConfigVoz = {
  velocidad: 'normal',
  tamanoTexto: 'normal',
  leerRespuestas: true,
};

const AsistenteConfigContext = createContext<AsistenteConfigContextValue>({
  config: defaultConfig,
  setVelocidad: () => {},
  setTamanoTexto: () => {},
  toggleLeerRespuestas: () => {},
});

function persistir(config: ConfigVoz) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config)).catch((err) =>
    console.warn('[AsistenteConfig] Error al guardar:', err),
  );
}

export function AsistenteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigVoz>(defaultConfig);

  // Cargar la configuración guardada al montar el provider
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<ConfigVoz>;
        // Merge con defaults por si el shape cambió entre versiones
        setConfig({ ...defaultConfig, ...parsed });
      })
      .catch((err) => console.warn('[AsistenteConfig] Error al cargar:', err));
  }, []);

  const setVelocidad = useCallback((v: ConfigVoz['velocidad']) => {
    setConfig((prev) => {
      const nuevo = { ...prev, velocidad: v };
      persistir(nuevo);
      return nuevo;
    });
  }, []);

  const setTamanoTexto = useCallback((t: ConfigVoz['tamanoTexto']) => {
    setConfig((prev) => {
      const nuevo = { ...prev, tamanoTexto: t };
      persistir(nuevo);
      return nuevo;
    });
  }, []);

  const toggleLeerRespuestas = useCallback(() => {
    setConfig((prev) => {
      const nuevo = { ...prev, leerRespuestas: !prev.leerRespuestas };
      persistir(nuevo);
      return nuevo;
    });
  }, []);

  return (
    <AsistenteConfigContext.Provider
      value={{ config, setVelocidad, setTamanoTexto, toggleLeerRespuestas }}
    >
      {children}
    </AsistenteConfigContext.Provider>
  );
}

export function useAsistenteConfig() {
  return useContext(AsistenteConfigContext);
}

// Mapeo de tamaño de texto a escala de fuente
export function getFontScale(tamano: ConfigVoz['tamanoTexto']): number {
  switch (tamano) {
    case 'grande':    return 1.15;
    case 'muy_grande': return 1.35;
    default:          return 1;
  }
}

// Mapeo de velocidad a rate de expo-speech
export function getSpeechRate(velocidad: ConfigVoz['velocidad']): number {
  return velocidad === 'lenta' ? 0.7 : 0.9;
}
