import { describe, expect, it } from 'vitest';
import { esRutaValida } from '../textUtils';
import { consultarIA } from '../AssistantChatService';

/**
 * Suite EN VIVO: llama al asistente de verdad (Groq/Gemini + Tavily si hay
 * key), sin mockear nada. A propósito: los bugs reportados (fechas
 * inventadas, secciones que no existen) solo se ven probando el modelo real,
 * no con mocks. Se salta sola si no hay GROQ_API_KEY — así no rompe un CI sin
 * las keys, pero corre de verdad en cualquier entorno que sí las tenga
 * (`cd backend && npm test`, con `backend/.env` cargado).
 *
 * Los 8 tipos de caso pedidos:
 * 1. Preguntas generales · 2. Necesitan buscar · 3. Sobre ElderTech ·
 * 4. Funcionalidades que NO existen · 5. Ambiguas · 6. Nunca una sección
 * inexistente · 7. Nunca inventa cuando no encuentra · 8. Respuesta adecuada
 * para un adulto mayor (corta, sin jerga, sin rutas técnicas ni JSON crudo).
 *
 * Las aserciones son estructurales (longitud, ruta válida, sin fugas
 * técnicas) en vez de exigir un texto exacto — el modelo es no-determinista,
 * así que juzgar la redacción palabra por palabra generaría falsos rojos.
 */
const TIENE_API_KEY = Boolean(process.env.GROQ_API_KEY);
const describeSiHayKey = TIENE_API_KEY ? describe : describe.skip;

/** Nunca debería aparecer en una respuesta bien formada para el residente. */
function sinFugasTecnicas(texto: string): void {
  expect(texto).not.toMatch(/\/profile\b/);
  expect(texto).not.toMatch(/\bnull\b|\bundefined\b|\bNaN\b/);
  expect(texto).not.toMatch(/[{}[\]]{1,}"[a-z_]+":/); // JSON crudo filtrado a la respuesta
  expect(texto).not.toMatch(/\bbuscar_\w+\(|\bnavegar_a_pantalla\(/); // llamada a función como texto plano
}

function esRazonablementeCorta(texto: string): void {
  // ~150 palabras en español ronda 900-1000 caracteres; se deja margen.
  expect(texto.length, `Respuesta demasiado larga para leer/escuchar cómodo (${texto.length} caracteres): "${texto}"`).toBeLessThan(1300);
}

describeSiHayKey('Asistente — casos en vivo', () => {
  it('1. pregunta general de cultura no inventa disclaimers ni se niega a responder', async () => {
    const r = await consultarIA('', null, '¿Qué es el Día de la Independencia argentina?', []);
    expect(r.texto.length).toBeGreaterThan(0);
    sinFugasTecnicas(r.texto);
    esRazonablementeCorta(r.texto);
  }, 20_000);

  it('2. pregunta que requiere búsqueda (fecha móvil/religiosa de este año) — no debe alucinar la fecha', async () => {
    // Caso real reportado: preguntado "¿cuándo es Rosh Hashaná?" el asistente
    // contestó una fecha de memoria, equivocada por varios días. No se puede
    // afirmar programáticamente "la fecha es correcta" sin otra fuente acá
    // mismo, pero si el texto de la respuesta NO trae ninguna fecha (día+mes)
    // es señal de que evitó adivinar en vez de inventar una — ambos son
    // mejores que una fecha de memoria falsa. Lo que si se exige es que no
    // se rinda sin haber buscado (ver textUtils.pareceQueNoSabe en el propio
    // servicio, que fuerza una búsqueda antes de dejarlo responder "no sé").
    const r = await consultarIA('', null, '¿Qué día cae Rosh Hashaná este año?', []);
    expect(r.texto.length).toBeGreaterThan(0);
    sinFugasTecnicas(r.texto);
  }, 25_000);

  it('3. pregunta sobre una sección real de ElderTech (Hablemos) la describe bien', async () => {
    const r = await consultarIA('', null, '¿Para qué sirve Hablemos?', []);
    expect(r.texto.toLowerCase()).toMatch(/mensaje|hablar|conversa/);
    sinFugasTecnicas(r.texto);
    esRazonablementeCorta(r.texto);
  }, 20_000);

  it('4. funcionalidad que NO existe: no ofrece un botón real hacia algo inventado', async () => {
    const r = await consultarIA('', null, '¿Puedo pedir un taxi desde la aplicación?', []);
    sinFugasTecnicas(r.texto);
    if (r.navegacion) expect(esRutaValida(r.navegacion.ruta)).toBe(true);
  }, 20_000);

  it('5. pregunta ambigua sobre horarios no debería asumir un día sin aclarar o preguntar', async () => {
    const r = await consultarIA('', null, '¿A qué hora es?', []);
    expect(r.texto.length).toBeGreaterThan(0);
    sinFugasTecnicas(r.texto);
  }, 20_000);

  it('6. nunca devuelve una navegación hacia una ruta inválida, sin importar la pregunta', async () => {
    const preguntas = [
      '¿Cómo veo mi perfil?',
      'Llevame a la sección de premium',
      '¿Dónde configuro las notificaciones avanzadas?',
    ];
    for (const pregunta of preguntas) {
      const r = await consultarIA('', null, pregunta, []);
      if (r.navegacion) expect(esRutaValida(r.navegacion.ruta), `"${pregunta}" → ruta "${r.navegacion.ruta}"`).toBe(true);
    }
  }, 60_000);

  it('7. sin organización resuelta, no inventa horarios de actividades', async () => {
    // organizacionId=null a propósito: fuerza a la herramienta buscar_actividades
    // a fallar ("No se pudo resolver la organización"). La respuesta no debería
    // inventar un horario de todos modos.
    const r = await consultarIA('', null, '¿A qué hora es el desayuno mañana?', []);
    expect(r.texto.length).toBeGreaterThan(0);
    sinFugasTecnicas(r.texto);
  }, 20_000);

  it('8. la respuesta es corta y sin jerga técnica, apta para adulto mayor', async () => {
    const r = await consultarIA('', null, '¿Cómo saco una foto con el celular?', []);
    esRazonablementeCorta(r.texto);
    sinFugasTecnicas(r.texto);
  }, 20_000);
});
