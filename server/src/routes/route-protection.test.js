import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Route protection audit.
 *
 * Walks the mounted Express router stack and asserts that every route carries
 * the middleware its access policy requires. This is deliberately not an
 * integration test: it needs no database, so unlike the repository suites it
 * runs on a clean clone and in CI.
 *
 * What it catches is the failure that actually happens — a route shipping
 * without its guard. A behavioural test proves the middleware works; this
 * proves it is applied. Both matter, and only this one fails loudly when
 * someone adds an endpoint and forgets the auth chain.
 *
 * Adding a route without adding it to POLICY below fails the final test, so
 * new endpoints cannot be introduced without an explicit access decision.
 */

const PUBLIC = 'public';
const AUTH = 'authenticate';
const ADMIN = 'admin';
const OWNER = 'owner';

/**
 * Expected policy per route, from System Plan 8.2 and
 * docs/security-addendum.md.
 */
const POLICY = [
  // Auth — credential endpoints are public by necessity
  { method: 'post', path: '/auth/register', requires: PUBLIC },
  { method: 'post', path: '/auth/login', requires: PUBLIC },
  { method: 'post', path: '/auth/refresh', requires: PUBLIC },
  { method: 'post', path: '/auth/logout', requires: AUTH },
  { method: 'get', path: '/auth/me', requires: AUTH },

  // Catalogue — guests browse
  { method: 'get', path: '/products', requires: PUBLIC },
  { method: 'get', path: '/products/:id', requires: PUBLIC },
  { method: 'get', path: '/categories', requires: PUBLIC },

  // Catalogue management — admin only
  { method: 'post', path: '/products', requires: ADMIN },
  { method: 'put', path: '/products/:id', requires: ADMIN },
  { method: 'delete', path: '/products/:id', requires: ADMIN },

  // Cart — registered customers only, guests cannot add to cart
  { method: 'get', path: '/cart', requires: AUTH },
  { method: 'post', path: '/cart/items', requires: AUTH },
  { method: 'patch', path: '/cart/items/:itemId', requires: AUTH },
  { method: 'delete', path: '/cart/items/:itemId', requires: AUTH },

  // Orders
  { method: 'post', path: '/orders', requires: AUTH },
  { method: 'get', path: '/orders', requires: AUTH },
  { method: 'get', path: '/orders/:id', requires: OWNER },

  // Reviews — public to read, gated to write
  { method: 'get', path: '/products/:id/reviews', requires: PUBLIC },
  { method: 'post', path: '/products/:id/reviews', requires: AUTH },
  { method: 'put', path: '/reviews/:id', requires: AUTH },
  { method: 'delete', path: '/reviews/:id', requires: AUTH },
];

/** Middleware function names, as they appear on the Express layer stack. */
const NAMES = {
  authenticate: 'authenticate',
  authorize: 'authorizeMiddleware',
  // docs/security-addendum.md section 2: requireOwnershipOrAdmin is specified
  // but src/middleware/require-ownership.js is not yet on main — it exists on
  // open PR #80 (fix/SEN371-46-order-ownership-enumeration), not merged as of
  // this test. Note the factory is named requireOwnershipOrAdmin, but it
  // *returns* `async function requireOwnershipMiddleware(...)`, and Express's
  // layer.name reflects the returned function actually on the stack, not the
  // factory — so this is the name to match once #80 lands, not the factory
  // name. Until then, GET /orders/:id enforces ownership via an inline check
  // in the route handler with no named middleware, so this assertion fails
  // correctly: the audit is catching the real gap PR #80 closes.
  ownership: 'requireOwnershipMiddleware',
};

let routes;

/**
 * Recovers the literal mount path of a nested router from its layer regexp.
 *
 * Express (path-to-regexp v0.1.x, matching the Express 4 pin in package.json)
 * compiles a mount path like "/products/:productId/reviews" into a regexp
 * such as /^\/products(?:\/([^/]+?))\/reviews\/?(?=\/|$)/, with the param
 * names lifted out into layer.keys in capture-group order rather than left
 * in the source. So the params have to be substituted back in from
 * layer.keys — stripping the anchors and unescaping slashes is not enough on
 * its own, the capture groups still need names.
 */
function reconstructMountSegment(layer) {
  const src = layer.regexp?.source;
  if (!src) return '';

  let segment = src
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\$$/, '');

  const keys = layer.keys ?? [];
  let i = 0;
  segment = segment.replace(
    /\(\?:\\\/\(\[\^\/\]\+\?\)\)/g,
    () => `\\/:${keys[i++]?.name ?? 'param'}`
  );

  return segment.replace(/\\\//g, '/');
}

/**
 * Flattens the router tree into { method, path, middleware[] } entries.
 * Router-level middleware (router.use(authenticate)) applies to every route
 * beneath it, so it is inherited down rather than read per-route.
 */
function collect(stack, prefix = '', inherited = []) {
  const found = [];

  for (const layer of stack) {
    if (layer.route) {
      // A route mounted at its router's root has path "/"; keeping that
      // literally would turn "/cart" into "/cart/" once the prefix is
      // prepended, which then fails to match POLICY's "/cart".
      const routeSegment = layer.route.path === '/' ? '' : layer.route.path;
      const path = prefix + routeSegment || '/';
      const middleware = [
        ...inherited,
        ...layer.route.stack.map((s) => s.name),
      ];

      for (const method of Object.keys(layer.route.methods)) {
        found.push({ method, path, middleware });
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      const segment = reconstructMountSegment(layer);
      found.push(...collect(layer.handle.stack, prefix + segment, inherited));
      continue;
    }

    // Router-level middleware applied before any route in this router.
    if (typeof layer.handle === 'function' && layer.name !== 'expressInit') {
      inherited = [...inherited, layer.name];
    }
  }

  return found;
}

/**
 * Treats any ":paramName" segment as an opaque positional wildcard so that
 * e.g. code using ":productId" matches a POLICY entry written as ":id" — the
 * param's name is an implementation detail, not part of the access policy.
 */
const normalizePath = (path) => path.replace(/:[^/]+/g, ':param');

beforeAll(async () => {
  const router = (await import('./index.js')).default;
  routes = collect(router.stack);
});

const find = (method, path) =>
  routes.find(
    (r) => r.method === method && normalizePath(r.path) === normalizePath(path)
  );

describe('route protection audit', () => {
  it('discovers the mounted routes', () => {
    // Guards the walker itself. If Express changes its internals and this
    // returns nothing, every assertion below would pass vacuously.
    expect(routes.length).toBeGreaterThan(15);
  });

  describe.each(POLICY.filter((p) => p.requires !== PUBLIC))(
    '$method $path',
    ({ method, path, requires }) => {
      it('is registered', () => {
        expect(find(method, path)).toBeDefined();
      });

      it('requires authentication', () => {
        expect(find(method, path).middleware).toContain(NAMES.authenticate);
      });

      if (requires === ADMIN) {
        it('is restricted by role', () => {
          expect(find(method, path).middleware).toContain(NAMES.authorize);
        });
      }

      if (requires === OWNER) {
        it('enforces ownership', () => {
          expect(find(method, path).middleware).toContain(NAMES.ownership);
        });
      }
    }
  );

  describe.each(POLICY.filter((p) => p.requires === PUBLIC))(
    '$method $path',
    ({ method, path }) => {
      it('is deliberately public', () => {
        // Not an oversight. Guests browse the catalogue and read reviews, and
        // the credential endpoints cannot require a token to obtain one.
        expect(find(method, path)?.middleware).not.toContain(
          NAMES.authenticate
        );
      });
    }
  );

  it('has an explicit policy for every mounted route', () => {
    const declared = new Set(
      POLICY.map((p) => `${p.method} ${normalizePath(p.path)}`)
    );
    const undeclared = routes
      .map((r) => `${r.method} ${normalizePath(r.path)}`)
      .filter((key) => !declared.has(key));

    // A new endpoint with no entry in POLICY fails here, so an access
    // decision cannot be skipped by accident.
    expect(undeclared).toEqual([]);
  });
});
