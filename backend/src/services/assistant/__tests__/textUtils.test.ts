import { describe, expect, it } from 'vitest';
import { esIntentLlamar, esRutaValida, extraerNavegacionDelTexto, normalizarRuta, pareceQueNoSabe } from '../textUtils';

describe('esRutaValida', () => {
  it('acepta las rutas estáticas reales de la app', () => {
    for (const ruta of ['/', '/horarios', '/llamar', '/articulos', '/asistente', '/mas/hablemos', '/agenda', '/como-usar', '/mas', '/mas/clima', '/mas/radio', '/mas/juegos', '/mas/pedidos', '/mas/accesibilidad']) {
      expect(esRutaValida(ruta), ruta).toBe(true);
    }
  });

  it('acepta rutas de detalle con un id real en secciones que sí tienen detalle', () => {
    for (const ruta of ['/horarios/abc-123', '/llamar/xyz', '/articulos/tutorial-1', '/agenda/rec-1', '/mas/radio/fm-100']) {
      expect(esRutaValida(ruta), ruta).toBe(true);
    }
  });

  it('acepta juegos reales bajo /mas/juegos/<slug>', () => {
    for (const juego of ['jardin', 'bloques', 'ahorcado', 'memotest', 'simon', 'conexiones', 'laberinto', 'sopa', 'puntos']) {
      expect(esRutaValida(`/mas/juegos/${juego}`), juego).toBe(true);
    }
  });

  it('rechaza un juego que no existe', () => {
    expect(esRutaValida('/mas/juegos/ajedrez')).toBe(false);
  });

  it('rechaza "/profile" — no existe ninguna pantalla de perfil en la app', () => {
    // Regresión: esta ruta estuvo habilitada en una versión vieja del prompt
    // y de esta validación, apuntando a una pantalla que nunca existió.
    expect(esRutaValida('/profile')).toBe(false);
  });

  it('rechaza secciones inventadas', () => {
    for (const ruta of ['/premium', '/configuracion-avanzada', '/resultados', '/noticias', '/tienda']) {
      expect(esRutaValida(ruta), ruta).toBe(false);
    }
  });

  it('rechaza el placeholder "ID" que el modelo a veces copia literal', () => {
    for (const ruta of ['/horarios/ID', '/horarios/id', '/articulos/<ID>', '/llamar/{id}', '/agenda/:id']) {
      expect(esRutaValida(ruta), ruta).toBe(false);
    }
  });

  it('rechaza detalle en una sección que no tiene pantalla de detalle', () => {
    expect(esRutaValida('/mas/clima/algo')).toBe(false);
    expect(esRutaValida('/asistente/algo')).toBe(false);
  });
});

describe('normalizarRuta', () => {
  it('traduce sinónimos comunes a la ruta real', () => {
    expect(normalizarRuta('/tutoriales')).toBe('/articulos');
    expect(normalizarRuta('/contactos')).toBe('/llamar');
    expect(normalizarRuta('/actividades')).toBe('/horarios');
    expect(normalizarRuta('/hablemos')).toBe('/mas/hablemos');
    expect(normalizarRuta('/pedidos')).toBe('/mas/pedidos');
    expect(normalizarRuta('/juegos')).toBe('/mas/juegos');
    expect(normalizarRuta('/accesibilidad')).toBe('/mas/accesibilidad');
  });

  it('traduce sinónimos con id', () => {
    expect(normalizarRuta('/tutoriales/whatsapp-101')).toBe('/articulos/whatsapp-101');
    expect(normalizarRuta('/actividades/desayuno')).toBe('/horarios/desayuno');
    expect(normalizarRuta('/juegos/ahorcado')).toBe('/mas/juegos/ahorcado');
  });

  it('saca la barra final y usa "/" para vacío', () => {
    expect(normalizarRuta('/horarios/')).toBe('/horarios');
    expect(normalizarRuta('')).toBe('/');
  });

  it('deja pasar rutas ya reales sin tocarlas', () => {
    expect(normalizarRuta('/mas/hablemos')).toBe('/mas/hablemos');
  });
});

describe('extraerNavegacionDelTexto', () => {
  it('descarta una navegación hacia una ruta inventada aunque el modelo la escriba como texto', () => {
    const { texto, navegacion } = extraerNavegacionDelTexto('Puedo ayudarte. <navegar_a_pantalla ruta="/premium" etiqueta="Ver" emoji="⭐"/>');
    expect(navegacion).toBeUndefined();
    expect(texto).not.toContain('navegar_a_pantalla');
  });

  it('acepta una navegación hacia una ruta real', () => {
    const { navegacion } = extraerNavegacionDelTexto('Mirá esto. <navegar_a_pantalla ruta="/horarios" etiqueta="Ver horarios" emoji="📅"/>');
    expect(navegacion).toEqual({ ruta: '/horarios', etiqueta: 'Ver horarios', emoji: '📅' });
  });

  it('limpia la llamada a función cuando el modelo la escribe como texto plano en vez de invocarla', () => {
    const { texto } = extraerNavegacionDelTexto('Ya reviso.\nbuscar_actividades(busqueda="desayuno")\nEl desayuno es a las 8.');
    expect(texto).not.toContain('buscar_actividades');
    expect(texto).toContain('El desayuno es a las 8.');
  });
});

describe('pareceQueNoSabe', () => {
  it('detecta frases de rendición típicas', () => {
    for (const frase of [
      'No tengo información sobre eso.',
      'No dispongo de datos actualizados.',
      'No sabría decirte cuándo es.',
      'No estoy seguro de esa fecha.',
      'Lo siento, no puedo ayudarte con eso.',
    ]) {
      expect(pareceQueNoSabe(frase), frase).toBe(true);
    }
  });

  it('no dispara con una respuesta normal que sí tiene contenido', () => {
    for (const frase of [
      'El desayuno es a las 8 de la mañana.',
      'Hoy está soleado, 22 grados.',
      'Para llamar, tocá el botón Llamar en la pantalla principal.',
    ]) {
      expect(pareceQueNoSabe(frase), frase).toBe(false);
    }
  });
});

describe('esIntentLlamar', () => {
  it('detecta pedidos de llamar/contactos', () => {
    for (const frase of ['quiero llamar a mi hija', 'llamame a Juan', '¿puedo llamar a mi hermano?', 'necesito ver mis contactos']) {
      expect(esIntentLlamar(frase), frase).toBe(true);
    }
  });

  it('no dispara con preguntas que no son sobre llamar', () => {
    for (const frase of ['¿qué actividad hay hoy?', '¿cómo está el clima?', '¿cuándo es Rosh Hashaná?']) {
      expect(esIntentLlamar(frase), frase).toBe(false);
    }
  });
});
