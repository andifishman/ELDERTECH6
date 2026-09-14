// Lleva al residente directo a los ajustes de WiFi del celular — para que
// pueda cambiar de red sin tener que salir a buscar el ícono de Ajustes por
// su cuenta. Android tiene un atajo directo al panel de WiFi; iOS no permite
// eso desde una app (solo Apple puede), así que ahí se intenta abrir
// Ajustes ya posicionado en la app (mejor que nada) y si falla, Ajustes general.
import { Linking, Platform } from 'react-native';

export async function abrirAjustesWifi(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.WIFI_SETTINGS');
      return;
    }
    if (Platform.OS === 'ios') {
      const url = 'App-Prefs:root=WIFI';
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    }
  } catch {
    // sigue al fallback de abajo
  }
  await Linking.openSettings();
}
