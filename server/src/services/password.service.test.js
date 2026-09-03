import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  verifyAgainstDummyHash,
} from './password.service.js';

describe('validatePasswordPolicy', () => {
  it('accepts a password meeting every rule', () => {
    expect(validatePasswordPolicy('Passw0rd123')).toEqual([]);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(validatePasswordPolicy('Pas0w')).toContain(
      'must be at least 8 characters'
    );
  });

  it('rejects a password with no uppercase letter', () => {
    expect(validatePasswordPolicy('passw0rd123')).toContain(
      'must contain an uppercase letter'
    );
  });

  it('rejects a password with no lowercase letter', () => {
    expect(validatePasswordPolicy('PASSW0RD123')).toContain(
      'must contain a lowercase letter'
    );
  });

  it('rejects a password with no digit', () => {
    expect(validatePasswordPolicy('PasswordAbc')).toContain(
      'must contain a digit'
    );
  });

  it('reports every failing rule at once, not just the first', () => {
    expect(validatePasswordPolicy('abc')).toHaveLength(3);
  });

  it('rejects a non-string input without throwing', () => {
    expect(validatePasswordPolicy(undefined)).not.toEqual([]);
    expect(validatePasswordPolicy(12345678)).not.toEqual([]);
  });
});

describe('hashPassword', () => {
  it('does not return the plaintext password', async () => {
    const hash = await hashPassword('Passw0rd123');
    expect(hash).not.toBe('Passw0rd123');
    expect(hash).not.toContain('Passw0rd123');
  });

  it('produces a bcrypt hash at cost factor 12', async () => {
    const hash = await hashPassword('Passw0rd123');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('produces a different hash each time for the same password', async () => {
    const [a, b] = await Promise.all([
      hashPassword('Passw0rd123'),
      hashPassword('Passw0rd123'),
    ]);
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('Passw0rd123');
    await expect(verifyPassword('Passw0rd123', hash)).resolves.toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('Passw0rd123');
    await expect(verifyPassword('Wrongpass1', hash)).resolves.toBe(false);
  });

  it('is case sensitive', async () => {
    const hash = await hashPassword('Passw0rd123');
    await expect(verifyPassword('passw0rd123', hash)).resolves.toBe(false);
  });
});

describe('verifyAgainstDummyHash', () => {
  it('always resolves false', async () => {
    await expect(verifyAgainstDummyHash()).resolves.toBe(false);
  });

  it('takes comparable time to a real verification', async () => {
    const hash = await hashPassword('Passw0rd123');

    const realStart = performance.now();
    await verifyPassword('Wrongpass1', hash);
    const realMs = performance.now() - realStart;

    const dummyStart = performance.now();
    await verifyAgainstDummyHash();
    const dummyMs = performance.now() - dummyStart;

    // Within an order of magnitude is enough to show no trivial timing gap.
    // A precise assertion would be flaky on shared CI runners.
    expect(dummyMs).toBeGreaterThan(realMs / 10);
  });
});
