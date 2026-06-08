// Contexto de configuración del Asistente — velocidad de voz y tamaño de texto
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ConfigVoz } from '@/types/asistente.types';

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

export function AsistenteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigVoz>(defaultConfig);

  const setVelocidad = useCallback((v: ConfigVoz['velocidad']) => {
    setConfig((prev) => ({ ...prev, velocidad: v }));
  }, []);

  const setTamanoTexto = useCallback((t: ConfigVoz['tamanoTexto']) => {
    setConfig((prev) => ({ ...prev, tamanoTexto: t }));
  }, []);

  const toggleLeerRespuestas = useCallback(() => {
    setConfig((prev) => ({ ...prev, leerRespuestas: !prev.leerRespuestas }));
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
