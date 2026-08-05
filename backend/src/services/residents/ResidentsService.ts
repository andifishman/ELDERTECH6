import * as repo from '../../repositories/residentsRepository';

/** Lookups de residente de solo lectura, consumidos por otros módulos (activities, weather, assistant, hablemos). */

export async function getOrganizacionIdDeResidente(residenteId: string): Promise<string | null> {
  return repo.getOrganizacionIdDeResidente(residenteId);
}

export async function getResidenteContext(residenteId: string): Promise<repo.ResidenteContext> {
  return repo.getResidenteContext(residenteId);
}

/** Nombre completo de un residente — usado por Hablemos en el título de las notificaciones push. */
export async function obtenerNombreCompleto(residenteId: string): Promise<{ nombre: string; apellido: string } | null> {
  return repo.obtenerNombreCompleto(residenteId);
}

/** Buscar residentes con cuenta para iniciar una conversación (módulo Hablemos). */
export async function buscarPorNombre(
  organizacionId: string,
  query: string,
  excluirResidenteId: string,
): Promise<repo.ResidenteBusquedaResumen[]> {
  return repo.buscarPorNombreConCuenta(organizacionId, query, excluirResidenteId);
}
