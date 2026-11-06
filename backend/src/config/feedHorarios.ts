/**
 * La grilla "Horarios del Hogar" sale de UN sistema externo que es de UNA institución (Ledor Vador).
 * Con varias instituciones en la plataforma, las demás no pueden recibir esa grilla como si fuera suya:
 * solo la institución dueña del feed la ve; el resto muestra la suya (vacía hasta que cargue actividades).
 *
 * `LEDOR_FEED_ORG_ID` permite cambiarla sin tocar código. Si algún día otra institución tiene su propio
 * feed, esto pasa a ser una columna de `organizaciones` (feed + clave) en vez de un id fijo.
 */
const ORG_DEL_FEED = process.env.LEDOR_FEED_ORG_ID ?? 'c0ddba5b-9d1e-4210-ad46-bfc37aba03bf';

/** ¿Esta institución es la dueña del feed externo de horarios? Sin institución conocida se permite (comportamiento previo). */
export function feedAplicaA(organizacionId: string | null | undefined): boolean {
  return !organizacionId || organizacionId === ORG_DEL_FEED;
}
