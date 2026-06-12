// Contexto global de accesibilidad — tamaño de texto y alto contraste para toda la app
// Persiste en AsyncStorage para que el residente no pierda su config al cerrar la app
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'eldertech_accesibilidad_v1';

export type TamanoTexto = 'normal' | 'grande' | 'muy_grande';

export interface AccesibilidadConfig {
  tamanoTexto: TamanoTexto;
  altoContraste: boolean;
}

interface AccesibilidadContextValue {
  config: AccesibilidadConfig;
  escala: number;
  setTamanoTexto: (t: TamanoTexto) => void;
  toggleAltoContraste: () => void;
}

const DEFAULT: AccesibilidadConfig = {
  tamanoTexto: 'normal',
  altoContraste: false,
};

const AccesibilidadContext = createContext<AccesibilidadContextValue>({
  config: DEFAULT,
  escala: 1,
  setTamanoTexto: () => {},
  toggleAltoContraste: () => {},
});

export function getEscala(t: TamanoTexto): number {
  switch (t) {
    case 'grande':     return 1.2;
    case 'muy_grande': return 1.45;
    default:           return 1;
  }
}

// Paleta de alto contraste — fondo oscuro, texto blanco puro
export const COLORES_AC = {
  fondo:        '#0A0A0A',
  superficie:   '#1A1A1A',
  borde:        '#444444',
  textoPrimario:'#FFFFFF',
  textoSecundario: '#CCCCCC',
  textoTenue:   '#888888',
} as const;

function persistir(config: AccesibilidadConfig) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config)).catch(
    (err) => console.warn('[Accesibilidad] Error al guardar:', err),
  );
}

export function AccesibilidadProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AccesibilidadConfig>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<AccesibilidadConfig>;
        setConfig({ ...DEFAULT, ...parsed });
      })
      .catch((err) => console.warn('[Accesibilidad] Error al cargar:', err));
  }, []);

  const setTamanoTexto = useCallback((t: TamanoTexto) => {
    setConfig((prev) => {
      const nuevo = { ...prev, tamanoTexto: t };
      persistir(nuevo);
      return nuevo;
    });
  }, []);

  const toggleAltoContraste = useCallback(() => {
    setConfig((prev) => {
      const nuevo = { ...prev, altoContraste: !prev.altoContraste };
      persistir(nuevo);
      return nuevo;
    });
  }, []);

  return (
    <AccesibilidadContext.Provider
      value={{ config, escala: getEscala(config.tamanoTexto), setTamanoTexto, toggleAltoContraste }}
    >
      {children}
    </AccesibilidadContext.Provider>
  );
}

export function useAccesibilidad() {
  return useContext(AccesibilidadContext);
}
