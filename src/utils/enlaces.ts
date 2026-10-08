// Abrir llamadas telefónicas y WhatsApp — nativo y web.
//
// Nativo (Android/iOS app): se mantiene el comportamiento histórico — `tel:` y el
// esquema `whatsapp://` con respaldo a wa.me (sin canOpenURL: en Android 11+ miente
// sin <queries> en el manifest).
//
// Web / Safari iOS / PWA instalada:
//  - `whatsapp://` NO sirve: Safari muestra "Safari no puede abrir la página porque
//    la dirección no es válida" si WhatsApp no está instalado, y desde una PWA
//    standalone ni siquiera sale. Se usa SIEMPRE el enlace universal https://wa.me/,
//    que iOS/Android resuelven abriendo la app de WhatsApp si está instalada y la
//    página de WhatsApp Web si no.
//  - `tel:` se abre navegando a la URL (Linking.openURL en web usa window.open, que
//    iOS bloquea para esquemas que no son http). En una PC sin app de telefonía
//    no pasa nada: ahí hay que marcar a mano (la pantalla muestra el número).
import { Linking, Platform } from 'react-native';

function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, '');
}

/** Conserva el "+" inicial (formato internacional) y quita todo lo demás que no sea dígito. */
function telefonoParaTel(telefono: string): string {
  const limpio = telefono.trim();
  return (limpio.startsWith('+') ? '+' : '') + soloDigitos(limpio);
}

/** Lanza si el dispositivo no puede realizar la llamada. */
export async function abrirLlamada(telefono: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Tiene que ejecutarse dentro del gesto de toque del usuario (no después de un await largo).
    window.location.href = `tel:${telefonoParaTel(telefono)}`;
    return;
  }
  await Linking.openURL(`tel:${telefono}`);
}

/** Lanza si no se pudo abrir WhatsApp. */
export async function abrirWhatsApp(telefono: string): Promise<void> {
  const numero = soloDigitos(telefono);
  if (Platform.OS === 'web') {
    const url = `https://wa.me/${numero}`;
    // _blank: así en el navegador se conserva la pestaña de ElderTech abierta y se
    // puede volver con "atrás"/cambiando de app. noopener: la pestaña nueva no
    // recibe acceso a window.opener.
    const ventana = window.open(url, '_blank', 'noopener,noreferrer');
    if (!ventana) window.location.href = url; // popup bloqueado: navegar en la misma pestaña
    return;
  }
  try {
    await Linking.openURL(`whatsapp://send?phone=${numero}`);
  } catch {
    await Linking.openURL(`https://wa.me/${numero}`);
  }
}
