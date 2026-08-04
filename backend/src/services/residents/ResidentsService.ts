import * as repo from '../../repositories/residentsRepository';

/** Lookups de residente de solo lectura, consumidos por otros módulos (activities, weather, assistant). */

export async function getOrganizacionIdDeResidente(residenteId: string): Promise<string | null> {
  return repo.getOrganizacionIdDeResidente(residenteId);
}

export async function getResidenteContext(residenteId: string): Promise<repo.ResidenteContext> {
  return repo.getResidenteContext(residenteId);
}
