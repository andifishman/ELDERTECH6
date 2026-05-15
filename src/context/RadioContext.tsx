import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';
import type { RadioStation, RadioPlayerState } from '@/types/radio.types';

interface RadioContextValue {
  radioActual: RadioStation | null;
  estado: RadioPlayerState;
  reproducir: (radio: RadioStation) => Promise<void>;
  detener: () => Promise<void>;
  alternar: (radio: RadioStation) => Promise<void>;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [radioActual, setRadioActual] = useState<RadioStation | null>(null);
  const [estado, setEstado] = useState<RadioPlayerState>('idle');

  const detener = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => null);
      await soundRef.current.unloadAsync().catch(() => null);
      soundRef.current = null;
    }
    setEstado('idle');
    setRadioActual(null);
  }, []);

  const reproducir = useCallback(async (radio: RadioStation) => {
    // Detener reproducción anterior
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => null);
      await soundRef.current.unloadAsync().catch(() => null);
      soundRef.current = null;
    }

    setEstado('loading');
    setRadioActual(radio);

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: radio.urlStream },
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (!status.isLoaded) {
            if (status.error) setEstado('error');
            return;
          }
          if (status.isPlaying) setEstado('playing');
          if (status.didJustFinish) setEstado('idle');
        },
      );

      soundRef.current = sound;
      setEstado('playing');
    } catch (err) {
      console.error('[Radio] Error al reproducir:', err);
      setEstado('error');
      setRadioActual(null);
    }
  }, []);

  const alternar = useCallback(async (radio: RadioStation) => {
    if (radioActual?.id === radio.id && estado === 'playing') {
      await detener();
    } else {
      await reproducir(radio);
    }
  }, [radioActual, estado, reproducir, detener]);

  return (
    <RadioContext.Provider value={{ radioActual, estado, reproducir, detener, alternar }}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadioPlayer(): RadioContextValue {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error('useRadioPlayer debe usarse dentro de RadioProvider');
  return ctx;
}
