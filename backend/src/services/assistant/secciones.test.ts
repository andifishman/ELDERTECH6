import { describe, expect, it } from 'vitest';
import { detectarPedidoDeIr, seccionesMencionadas } from './secciones';
import {
  derivaAlPersonal,
  esIntentLlamar,
  esRutaValida,
  esSaludoSimple,
  limpiarMarkdown,
  normalizarRuta,
  pareceSuposicionSobreLaResidencia,
} from './textUtils';

describe('detectarPedidoDeIr', () => {
  it.each([
    ['como voy a horarios', 'actividades'],
    ['¿Cómo llego a las actividades?', 'actividades'],
    ['donde esta la radio', 'radio'],
    ['como entro a los juegos', 'juegos'],
    ['llevame al clima', 'clima'],
    ['como hago para ver mis recordatorios', 'agenda'],
    ['donde estan las novedades', 'novedades'],
    ['como agrando la letra... donde esta la letra grande', 'accesibilidad'],
  ])('"%s" → %s', (mensaje, id) => {
    expect(detectarPedidoDeIr(mensaje)?.id).toBe(id);
  });

  it.each([
    'como esta el clima', // quiere el dato, no el camino
    'que actividades hay hoy',
    'donde hay kipas', // algo de la residencia, no una pantalla
    'como uso whatsapp',
    'como voy a la radio o a los juegos', // dos secciones: decide el modelo
  ])('"%s" no es un pedido de ir a una sección', (mensaje) => {
    expect(detectarPedidoDeIr(mensaje)).toBeNull();
  });
});

describe('seccionesMencionadas', () => {
  it('"más" suelto no cuenta como la sección Más', () => {
    expect(seccionesMencionadas('quiero saber más sobre el clima').map((s) => s.id)).toEqual(['clima']);
  });
});

describe('rutas del catálogo', () => {
  it('acepta las secciones nuevas y traduce alias', () => {
    expect(esRutaValida('/mas/juegos')).toBe(true);
    expect(esRutaValida('/agenda')).toBe(true);
    expect(normalizarRuta('/juegos')).toBe('/mas/juegos');
    expect(normalizarRuta('/horarios-hogar')).toBe('/horarios');
  });

  it('ya no acepta /profile (no existe esa pantalla)', () => {
    expect(esRutaValida('/profile')).toBe(false);
  });
});

describe('pareceSuposicionSobreLaResidencia', () => {
  it('detecta la respuesta inventada de las kipot', () => {
    expect(
      pareceSuposicionSobreLaResidencia(
        'Las kipá suelen guardarse en la sala de oración o en la oficina de la coordinación de la residencia.',
      ),
    ).toBe(true);
  });

  it('no salta con respuestas generales sin lugares de la residencia', () => {
    expect(pareceSuposicionSobreLaResidencia('En Pesaj generalmente se come matzá.')).toBe(false);
    expect(pareceSuposicionSobreLaResidencia('La sala de oración está en el primer piso.')).toBe(false);
  });
});

describe('derivaAlPersonal', () => {
  it('reconoce el "preguntale al personal"', () => {
    expect(derivaAlPersonal('No lo sé. Preguntale al personal de la residencia.')).toBe(true);
    expect(derivaAlPersonal('Consultá en enfermería.')).toBe(true);
    expect(derivaAlPersonal('No encontré ese resultado.')).toBe(false);
  });
});

describe('rutas técnicas en el texto', () => {
  it('saca la línea con la ruta que el modelo escribió como "botón"', async () => {
    const { extraerNavegacionDelTexto } = await import('./textUtils');
    const r = extraerNavegacionDelTexto('A las 17:00 hay Kabalat Shabat.\n\n"Navegar a KABALAT SHABAT" 📅 /horarios/122');
    expect(r.texto).toBe('A las 17:00 hay Kabalat Shabat.');
  });
  it('no toca barras comunes como 24/7 o fechas', async () => {
    const { extraerNavegacionDelTexto } = await import('./textUtils');
    expect(extraerNavegacionDelTexto('Atiende 24/7, el 14/11.').texto).toBe('Atiende 24/7, el 14/11.');
  });
});

describe('limpiarMarkdown', () => {
  it('saca negritas, títulos y viñetas con asterisco', () => {
    expect(limpiarMarkdown('1. Tocá el botón naranja **Más**.\n# Paso\n* uno')).toBe('1. Tocá el botón naranja Más.\nPaso\n- uno');
  });
});

describe('esSaludoSimple', () => {
  it.each(['hola', 'Hola!', 'buenas tardes', 'hola, ¿cómo estás?'])('"%s" es saludo', (m) => {
    expect(esSaludoSimple(m)).toBe(true);
  });
  it.each(['hola, qué hay hoy', 'hola como voy a horarios'])('"%s" trae una pregunta', (m) => {
    expect(esSaludoSimple(m)).toBe(false);
  });
});

describe('esIntentLlamar', () => {
  it('llamar sí, cómo agregar un contacto no', () => {
    expect(esIntentLlamar('quiero llamar a mi hija')).toBe(true);
    expect(esIntentLlamar('como agrego un contacto')).toBe(false);
  });
});

describe('corregirCaminos', () => {
  it('corrige "Más → Actividades" por el camino real', async () => {
    const { corregirCaminos } = await import('./secciones');
    const r = corregirCaminos('Hay 3 actividades.\nPara ver el detalle, tocá el botón “Más” y luego la tarjeta “Actividades”.\n📅 Actividades.');
    expect(r).toBe('Hay 3 actividades.\nEn la pantalla de inicio, tocá el botón rojo grande "Actividades" (es el primero, arriba de todo).');
  });

  it('respeta caminos correctos de varias líneas', async () => {
    const { corregirCaminos } = await import('./secciones');
    const ok = '1. Tocá el botón naranja "Más".\n2. Ahí tocá la tarjeta "Radio".';
    expect(corregirCaminos(ok)).toBe(ok);
    const ok2 = 'Tocá el botón naranja "Más" y después la tarjeta "Agenda".';
    expect(corregirCaminos(ok2)).toBe(ok2);
  });

  it('Juegos ya no está en "Más": se corrige al botón de inicio', async () => {
    const { corregirCaminos } = await import('./secciones');
    expect(corregirCaminos('Tocá el botón naranja "Más" y después la tarjeta "Juegos".')).toBe(
      'En la pantalla de inicio, tocá el botón "Juegos".',
    );
  });

  it('no toca texto que no explica caminos', async () => {
    const { corregirCaminos } = await import('./secciones');
    const t = 'Hoy hay más actividades que ayer.';
    expect(corregirCaminos(t)).toBe(t);
  });
});
