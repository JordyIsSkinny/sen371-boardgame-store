import { describe, it, expect, beforeAll } from 'vitest';

/**
 * config/index.js reads DATABASE_URL, JWT_SECRET and REFRESH_TOKEN_SECRET at
 * module-evaluation time, before dotenv is loaded anywhere in the test
 * runner (see issue #30). Setting fallbacks here and importing app.js
 * dynamically, only after those fallbacks are in place, keeps this file
 * runnable without a real database — nothing below issues a real query.
 */
let app;
let request;
let config;

beforeAll(async () => {
  process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET ??= 'test-access-secret';
  process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret';
  // Set unconditionally, not ??=: other test files set CLIENT_ORIGIN too,
  // just to a single origin so their app boots, and vitest can run test
  // files sequentially within one worker, so ??= here would silently lose
  // to whichever of those ran first. This file is the one that actually
  // asserts against the value, so it needs to win.
  //
  // Two origins on purpose: this is what exercises the allowlist. A
  // developer running the client locally against the deployed API, and the
  // deployed GitHub Pages site itself, both need to work at once in M4.
  process.env.CLIENT_ORIGIN =
    'http://localhost:5173,https://jordyisskinny.github.io';

  const [{ createApp }, configModule, supertestModule] = await Promise.all([
    import('./app.js'),
    import('./config/index.js'),
    import('supertest'),
  ]);

  request = supertestModule.default;
  config = configModule.config;
  app = createApp();
});

describe('security headers (System Plan 8.4)', () => {
  it('sets helmet default security headers and drops X-Powered-By', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(res.headers).toHaveProperty('x-frame-options');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });
});

describe('CORS (System Plan 8.4, docs/security-addendum.md section 4)', () => {
  it('reflects and allows credentials for the first configured origin', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', config.clientOrigins[0]);

    expect(res.headers['access-control-allow-origin']).toBe(config.clientOrigins[0]);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  // The whole point of the allowlist: a developer running the client
  // locally against the deployed API, and the deployed GitHub Pages site
  // itself, are both legitimate origins that need to work simultaneously.
  it('reflects and allows credentials for a second configured origin', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', config.clientOrigins[1]);

    expect(res.headers['access-control-allow-origin']).toBe(config.clientOrigins[1]);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not reflect an origin outside the allowlist', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://not-allowed.example');

    // No Access-Control-Allow-Origin header means the browser refuses to
    // expose the response to the calling page's JS, even though the server
    // still answers normally underneath — the same reasoning as a same-site
    // cookie: the block happens client-side, not as a server error.
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('still serves a request with no Origin header, e.g. curl or a server-to-server call', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('JSON payload limit (System Plan 8.4)', () => {
  it('rejects a body over 100kb', async () => {
    const oversized = { padding: 'x'.repeat(101 * 1024) };

    const res = await request(app).post('/api/v1/auth/login').send(oversized);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
  });
});

describe('general rate limiting (System Plan 8.4)', () => {
  it('advertises a limit of 100 requests per minute', async () => {
    const res = await request(app).get('/api/v1/health');

    // draft-7 headers combine limit and window into a single policy header
    // rather than a separate RateLimit-Limit header (draft-6's shape).
    expect(res.headers['ratelimit-policy']).toBe('100;w=60');
  });

  it('returns 429 RATE_LIMIT_EXCEEDED once the general limit is exceeded', async () => {
    let last;
    for (let i = 0; i < 105; i += 1) {
      last = await request(app).get('/api/v1/health');
    }

    expect(last.status).toBe(429);
    expect(last.body).toMatchObject({ status: 429, error: 'RATE_LIMIT_EXCEEDED' });
  });
});
