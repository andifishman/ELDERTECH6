import { describe, expect, it } from 'vitest';
import { diaSinTildes, mesActual, nombreCompleto, sinTildes, sumarDias, sumarMeses } from './format';

describe('fechas de la app de familiares', () => {
  it('suma días cruzando fin de mes y de año', () => {
    expect(sumarDias('2026-11-28', 5)).toBe('2026-12-03');
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('suma meses cruzando el año', () => {
    expect(sumarMeses('2026-11', 2)).toBe('2027-01');
    expect(sumarMeses('2026-01', -1)).toBe('2025-12');
  });

  it('el día de la semana sale sin tildes, igual que el feed del Hogar', () => {
    expect(diaSinTildes('2026-11-04')).toBe('miercoles'); // miércoles
    expect(diaSinTildes('2026-11-07')).toBe('sabado'); // sábado
    expect(diaSinTildes('2026-11-08')).toBe('domingo');
  });

  it('compara textos sin tildes ni mayúsculas', () => {
    expect(sinTildes(' Miércoles ')).toBe('miercoles');
  });

  it('el mes actual tiene formato AAAA-MM', () => {
    expect(mesActual()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('arma el nombre completo', () => {
    expect(nombreCompleto({ nombre: 'Rosa', apellido: 'Gómez' })).toBe('Rosa Gómez');
  });
});
