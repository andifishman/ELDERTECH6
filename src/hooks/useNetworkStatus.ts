// Estado de conectividad a internet — usa @react-native-community/netinfo,
// la librería estándar para esto en apps Expo/React Native (a diferencia de
// `navigator.onLine`, que no es confiable en React Native). Devuelve `true`
// mientras no se sepa todavía (recién arrancó la app) para no mostrar el
// aviso de "sin conexión" en un falso positivo de un instante.
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus(): { conectado: boolean } {
  const [conectado, setConectado] = useState(true);

  useEffect(() => {
    // `isConnected` = hay una conexión física (wifi/datos); `isInternetReachable`
    // = esa conexión realmente llega a internet (puede haber wifi sin internet,
    // típico de redes de hoteles/geriátricos con portal cautivo). Cuando
    // `isInternetReachable` todavía no se determinó (null), nos quedamos con
    // `isConnected` para no titilar el aviso mientras se termina de verificar.
    const unsubscribe = NetInfo.addEventListener((estado) => {
      const hayInternet = estado.isInternetReachable ?? estado.isConnected ?? true;
      setConectado(hayInternet);
    });
    return () => unsubscribe();
  }, []);

  return { conectado };
}
