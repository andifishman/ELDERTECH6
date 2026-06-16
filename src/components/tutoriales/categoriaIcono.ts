// Mapa categoría → ícono Ionicons. Centralizado para que la lista, los chips
// y las tarjetas usen siempre el mismo ícono (nunca emojis — pedido de diseño).
import type { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONO_CATEGORIA: Record<string, IconName> = {
  Todo: 'apps-outline',
  WhatsApp: 'logo-whatsapp',
  Fotos: 'camera-outline',
  Llamadas: 'call-outline',
  Internet: 'globe-outline',
  Seguridad: 'shield-checkmark-outline',
  Configuración: 'settings-outline',
  'Redes Sociales': 'people-outline',
};

/** Ícono representativo de la categoría; cae a 'school-outline' si no se conoce. */
export function getIconoCategoria(nombre?: string | null): IconName {
  return (nombre && ICONO_CATEGORIA[nombre]) || 'school-outline';
}
