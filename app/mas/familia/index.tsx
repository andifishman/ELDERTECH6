// Mi familia ahora vive dentro de Hablemos (con la etiqueta "Familia"): esta ruta queda solo para enlaces viejos.
import { Redirect } from 'expo-router';

export default function MiFamiliaRedirect() {
  return <Redirect href="/mas/hablemos" />;
}
