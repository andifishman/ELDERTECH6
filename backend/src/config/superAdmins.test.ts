import { describe, expect, it } from 'vitest';
import { esCuentaSuperAdmin, SUPER_ADMIN_EMAILS, SUPER_ADMIN_IDS } from './superAdmins';

describe('esCuentaSuperAdmin', () => {
  it('reconoce la cuenta por id', () => {
    expect(esCuentaSuperAdmin(SUPER_ADMIN_IDS[0], null)).toBe(true);
  });

  it('reconoce la cuenta por email sin importar mayúsculas', () => {
    expect(esCuentaSuperAdmin('otro-id', SUPER_ADMIN_EMAILS[0]!.toUpperCase())).toBe(true);
  });

  it('rechaza cualquier otra cuenta', () => {
    expect(esCuentaSuperAdmin('otro-id', 'residente@example.com')).toBe(false);
    expect(esCuentaSuperAdmin(null, null)).toBe(false);
  });
});
