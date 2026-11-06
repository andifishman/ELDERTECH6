import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseAdmin', () => ({ getSupabaseAdmin: vi.fn() }));

import { detectarTipo } from './familiaStorage';
import { filtrarPorPiso, sectorDeSeccion } from '../utils/pisoHogar';

describe('detectarTipo (por los bytes, no por lo que diga el cliente)', () => {
  it('reconoce JPG, PNG, WebP y PDF', () => {
    expect(detectarTipo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg');
    expect(detectarTipo(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(detectarTipo(Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]))).toBe('image/webp');
    expect(detectarTipo(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf');
  });

  it('rechaza un HTML o un script disfrazado de imagen, y archivos vacíos o cortos', () => {
    expect(detectarTipo(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectarTipo(Buffer.from('GIF89a....'))).toBeNull();
    expect(detectarTipo(Buffer.alloc(0))).toBeNull();
    expect(detectarTipo(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

describe('pisoHogar', () => {
  it('traduce las secciones del backoffice a los sectores del feed', () => {
    expect(sectorDeSeccion('1 AC')).toBe('1AC');
    expect(sectorDeSeccion('3B')).toBe('3ABC');
    expect(sectorDeSeccion('2 REHABILITACION')).toBe('REHAB');
    expect(sectorDeSeccion(null)).toBeNull();
  });

  it('filtra por piso; una actividad sin sectores es para todo el hogar', () => {
    const acts = [{ sectores: ['1AC'] }, { sectores: ['3ABC'] }, { sectores: [] }];
    expect(filtrarPorPiso(acts, '1 AC')).toEqual([{ sectores: ['1AC'] }, { sectores: [] }]);
  });

  it('si el piso no existe en la grilla o no se conoce, muestra todo (igual que la app de residentes)', () => {
    const acts = [{ sectores: ['1AC'] }, { sectores: ['3ABC'] }];
    expect(filtrarPorPiso(acts, 'BAIT')).toEqual(acts);
    expect(filtrarPorPiso(acts, null)).toEqual(acts);
  });
});
