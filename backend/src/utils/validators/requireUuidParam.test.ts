import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { requireUuidParam } from './requireUuidParam';

const reqCon = (id?: string) => ({ params: id === undefined ? {} : { id } }) as unknown as Request;

describe('requireUuidParam', () => {
  it('devuelve el valor si es un UUID', () => {
    expect(requireUuidParam(reqCon('9cb4b7a5-759b-432d-a805-bd4722954c88'), 'id')).toBe('9cb4b7a5-759b-432d-a805-bd4722954c88');
  });

  it('corta con 400 si falta el parámetro', () => {
    expect(() => requireUuidParam(reqCon(), 'id')).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('corta con 400 (y no con 500 desde la base) si el id está mal formado', () => {
    expect(() => requireUuidParam(reqCon('no-es-un-uuid'), 'id')).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
