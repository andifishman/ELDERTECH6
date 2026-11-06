import { describe, expect, it } from 'vitest';
import { actualizarOrganizacionSchema } from './organizaciones.validators';
import { contrasteConBlanco, esColorHex } from '../utils/color';

describe('color principal de una institución', () => {
  it('acepta un color oscuro, lo normaliza a mayúsculas y permite volver al por defecto (null)', () => {
    expect(actualizarOrganizacionSchema.parse({ colorPrincipal: '#1f6f5c' }).colorPrincipal).toBe('#1F6F5C');
    expect(actualizarOrganizacionSchema.parse({ colorPrincipal: null }).colorPrincipal).toBeNull();
    expect(actualizarOrganizacionSchema.parse({ colorPrincipal: '  ' }).colorPrincipal).toBeNull();
  });

  it('rechaza formatos inválidos (nada de texto libre ni css)', () => {
    for (const malo of ['rojo', '#FFF', '#GGGGGG', 'red; background:url(x)', '5F3E88', '#5F3E88FF']) {
      expect(() => actualizarOrganizacionSchema.parse({ colorPrincipal: malo }), malo).toThrow();
    }
  });

  it('rechaza un color tan claro que el texto blanco no se lee', () => {
    expect(() => actualizarOrganizacionSchema.parse({ colorPrincipal: '#FFEB3B' })).toThrow(/muy claro/);
    expect(() => actualizarOrganizacionSchema.parse({ colorPrincipal: '#FFFFFF' })).toThrow(/muy claro/);
  });

  it('el violeta de marca y un verde oscuro pasan el contraste', () => {
    expect(contrasteConBlanco('#5F3E88')).toBeGreaterThan(4.5);
    expect(contrasteConBlanco('#1F6F5C')).toBeGreaterThan(4.5);
    expect(esColorHex('#5F3E88')).toBe(true);
  });

  it('un cambio vacío no vale, y un email inválido se rechaza', () => {
    expect(() => actualizarOrganizacionSchema.parse({})).toThrow();
    expect(() => actualizarOrganizacionSchema.parse({ email: 'no-es-mail' })).toThrow();
    expect(actualizarOrganizacionSchema.parse({ email: '' }).email).toBeNull();
  });

  it('una cadena vacía en un dato opcional lo borra (null); ausente no lo toca', () => {
    const r = actualizarOrganizacionSchema.parse({ telefono: '', nombre: 'Nuevo nombre' });
    expect(r.telefono).toBeNull();
    expect(r.ciudad).toBeUndefined();
  });
});
