import { HttpError } from '../../middlewares/errorHandler';
import * as repo from '../../repositories/contactsRepository';
import { StatusCodes } from 'http-status-codes';

async function requireOwnContacto(residenteId: string, contactoId: string): Promise<void> {
  const owner = await repo.getResidenteIdDeContacto(contactoId);
  if (owner === null) throw new HttpError(StatusCodes.NOT_FOUND, 'Contacto no encontrado.');
  if (owner !== residenteId) throw new HttpError(StatusCodes.FORBIDDEN, 'No autorizado.');
}

export async function getContactos(residenteId: string): Promise<repo.ContactoResumen[]> {
  return repo.getContactos(residenteId);
}

export async function getTiposContacto(): Promise<repo.TipoContacto[]> {
  return repo.getTiposContacto();
}

/**
 * Crea un contacto — porteo de `agregarContacto` (src/services/contactosService.ts).
 * `residente_id` siempre se fuerza al del token, nunca al que mande el cliente
 * (antes esto lo garantizaba RLS; ahora el service-role no filtra solo, así
 * que el chequeo se hace acá).
 */
export async function agregarContacto(residenteId: string, payload: Omit<repo.ContactoUpsert, 'residente_id'>): Promise<repo.ContactoResumen> {
  if (payload.contacto_device_id) {
    const yaExiste = await repo.existeContactoPorDeviceId(residenteId, payload.contacto_device_id);
    if (yaExiste) throw new HttpError(StatusCodes.CONFLICT, 'Este contacto ya está en tu lista.');
  }
  return repo.crearContacto({ ...payload, residente_id: residenteId });
}

export async function actualizarContacto(residenteId: string, id: string, updates: Partial<repo.ContactoUpsert>): Promise<void> {
  await requireOwnContacto(residenteId, id);
  await repo.actualizarContacto(id, updates);
}

export async function toggleFavorito(residenteId: string, id: string, favorito: boolean): Promise<void> {
  await requireOwnContacto(residenteId, id);
  await repo.toggleFavorito(id, favorito);
}

export async function eliminarContacto(residenteId: string, id: string): Promise<void> {
  await requireOwnContacto(residenteId, id);
  await repo.eliminarContacto(id);
}

/**
 * Solo sube el archivo y devuelve la URL — no persiste `foto_url` en el
 * contacto. Igual que el `uploadFotoContacto` original: el cliente hace un
 * segundo llamado explícito a `actualizarContacto` para guardar la URL
 * (así puede mostrar el preview optimista antes de confirmar el guardado).
 */
export async function subirFoto(residenteId: string, contactoId: string, buffer: Buffer, contentType: string): Promise<string> {
  await requireOwnContacto(residenteId, contactoId);
  return repo.subirFotoContacto(contactoId, buffer, contentType);
}
