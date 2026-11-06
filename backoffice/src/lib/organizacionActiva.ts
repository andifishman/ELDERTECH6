// Institución sobre la que trabaja un super admin (el resto de las cuentas siempre opera sobre la suya: el backend ignora esto).
// Se guarda en el navegador y viaja en el header X-Organizacion-Id de cada pedido (ver apiClient).
const CLAVE = 'eldertech:organizacion-activa';

export function organizacionElegida(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function elegirOrganizacion(id: string | null): void {
  try {
    if (id) localStorage.setItem(CLAVE, id);
    else localStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: el selector no recuerda la elección */
  }
}
