// Preferencia global de sonido de los Juegos — persiste en AsyncStorage para
// que la elección del residente se mantenga entre partidas y al cerrar la app.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'eldertech_sonido_juegos_v1';

interface SonidoJuegosContextValue {
  sonidoActivado: boolean;
  toggleSonido: () => void;
}

const SonidoJuegosContext = createContext<SonidoJuegosContextValue>({
  sonidoActivado: true,
  toggleSonido: () => {},
});

export function SonidoJuegosProvider({ children }: { children: React.ReactNode }) {
  const [sonidoActivado, setSonidoActivado] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw != null) setSonidoActivado(raw === 'true');
      })
      .catch((err) => console.warn('[SonidoJuegos] Error al cargar:', err));
  }, []);

  const toggleSonido = useCallback(() => {
    setSonidoActivado((prev) => {
      const nuevo = !prev;
      AsyncStorage.setItem(STORAGE_KEY, String(nuevo)).catch((err) => console.warn('[SonidoJuegos] Error al guardar:', err));
      return nuevo;
    });
  }, []);

  return (
    <SonidoJuegosContext.Provider value={{ sonidoActivado, toggleSonido }}>
      {children}
    </SonidoJuegosContext.Provider>
  );
}

export function useSonidoJuegos() {
  return useContext(SonidoJuegosContext);
}
