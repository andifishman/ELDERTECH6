import * as repo from '../../repositories/weatherRepository';

export interface CiudadInput {
  nombre: string;
  pais: string;
  lat: number;
  lon: number;
  timezone: string;
}

export async function getCiudadesFamiliares(residenteId: string): Promise<repo.CiudadFamiliar[]> {
  return repo.getCiudadesFamiliaresDeResidente(residenteId);
}

/**
 * Sincroniza una lista de ciudades (desde AsyncStorage del cliente) contra
 * Supabase — porteo de `sincronizarConSupabase` (app/mas/clima.tsx). Fallo
 * silencioso por ciudad: si una falla, las demás igual se sincronizan.
 */
export async function syncCiudades(residenteId: string, ciudades: CiudadInput[]): Promise<void> {
  for (const ciudad of ciudades) {
    try {
      const ciudadId = await repo.resolverOCrearCiudadFamiliar(ciudad);
      if (ciudadId) await repo.vincularCiudadAResidente(residenteId, ciudadId);
    } catch {
      // Fallo silencioso — no bloquea la sincronización del resto de las ciudades.
    }
  }
}

/** Desvincula una ciudad del residente — porteo del flujo de borrado en clima.tsx. */
export async function removeCiudad(
  residenteId: string,
  ciudad: { nombre: string; pais: string; dbId?: string },
): Promise<void> {
  const ciudadId = ciudad.dbId ?? (await repo.buscarCiudadFamiliarPorNombreYPais(ciudad.nombre, ciudad.pais));
  if (ciudadId) await repo.desvincularCiudadDeResidente(residenteId, ciudadId);
}
