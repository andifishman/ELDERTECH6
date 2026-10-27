import { describe, expect, it } from 'vitest';
import { extraerNavegacionDelTexto } from './textUtils';

const NAV = { ruta: '/llamar', etiqueta: 'Ir a Contactos', emoji: '📞' };

describe('extraerNavegacionDelTexto', () => {
  it('llamada tipo función', () => {
    const r = extraerNavegacionDelTexto('Podés llamar desde acá.\nnavegar_a_pantalla(ruta="/llamar", etiqueta="Ir a Contactos", emoji="📞")');
    expect(r.texto).toBe('Podés llamar desde acá.');
    expect(r.navegacion).toEqual(NAV);
  });

  it('tag autocerrado', () => {
    const r = extraerNavegacionDelTexto('Listo. <navegar_a_pantalla ruta="/llamar" etiqueta="Ir a Contactos" emoji="📞"/>');
    expect(r.texto).toBe('Listo.');
    expect(r.navegacion).toEqual(NAV);
  });

  it('estilo Llama <function=...>{json}</function>', () => {
    const r = extraerNavegacionDelTexto('Tocá el botón. <function=navegar_a_pantalla>{"ruta": "/llamar", "etiqueta": "Ir a Contactos", "emoji": "📞"}</function>');
    expect(r.texto).toBe('Tocá el botón.');
    expect(r.navegacion).toEqual(NAV);
  });

  it('objeto JSON con name y parameters', () => {
    const r = extraerNavegacionDelTexto('Dale.\n{"name": "navegar_a_pantalla", "parameters": {"ruta": "/llamar", "etiqueta": "Ir a Contactos", "emoji": "📞"}}');
    expect(r.texto).toBe('Dale.');
    expect(r.navegacion).toEqual(NAV);
  });

  it('JSON sin cerrar / línea cortada no deja código visible', () => {
    const r = extraerNavegacionDelTexto('Dale.\nnavegar_a_pantalla {"ruta": "/llamar", "etiqueta": "Ir');
    expect(r.texto).toBe('Dale.');
  });

  it('traduce alias y descarta rutas inventadas', () => {
    expect(extraerNavegacionDelTexto('<navegar_a_pantalla ruta="/tutoriales" etiqueta="Ver" emoji="📚"/>').navegacion?.ruta).toBe('/articulos');
    expect(extraerNavegacionDelTexto('<navegar_a_pantalla ruta="/inventada" etiqueta="x" emoji="x"/>').navegacion).toBeUndefined();
  });

  it('texto normal queda intacto', () => {
    expect(extraerNavegacionDelTexto('Hola, ¿cómo estás? {no es código}').texto).toBe('Hola, ¿cómo estás? {no es código}');
  });
});
