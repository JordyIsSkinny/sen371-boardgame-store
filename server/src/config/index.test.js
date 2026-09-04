import { describe, it, expect, beforeEach } from 'vitest';

/**
 * config/index.js validates its inputs at module-evaluation time, so each
 * case here needs a fresh module instance built from its own env vars. The
 * query-string suffix defeats the import cache, forcing a real re-evaluation
 * instead of returning the first run's already-built config.
 */
function freshImport() {
  return import(/* @vite-ignore */ `./index.js?t=${Date.now()}-${Math.random()}`);
}

describe('config', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  });

  it('throws when JWT_SECRET and REFRESH_TOKEN_SECRET are identical', async () => {
    process.env.JWT_SECRET = 'same-secret';
    process.env.REFRESH_TOKEN_SECRET = 'same-secret';

    await expect(freshImport()).rejects.toThrow(
      /JWT_SECRET and REFRESH_TOKEN_SECRET must be different/
    );
  });

  it('loads normally when the secrets differ', async () => {
    process.env.JWT_SECRET = 'access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';

    const mod = await freshImport();

    expect(mod.config.jwt.secret).toBe('access-secret');
    expect(mod.config.jwt.refreshSecret).toBe('refresh-secret');
  });
});
