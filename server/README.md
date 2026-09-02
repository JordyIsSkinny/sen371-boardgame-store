# Board Game Store API — Milestone 2 Scaffold

Architecture Implementation (B). This is the scaffold pushed at Monday's
kickoff, plus the cart vertical slice as the reference implementation
everyone else's endpoints should structurally match.

## Running it

```
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Copy `.env.example` to `.env` first and fill in a real `DATABASE_URL`.

## Structure

```
src/
  app.js            Express app + full middleware chain, wired once, here only
  server.js         Entry point, starts the app, handles SIGTERM/SIGINT
  config/           Single source of truth for env vars, nothing else reads process.env
  lib/
    prismaClient.js Singleton Prisma client (Milestone 1, Singleton pattern)
  middleware/
    errorHandler.js STUB, owned by A, replace Tuesday. Shape is locked, do not change it.
    notFound.js     Catches unmatched routes
    auth.stub.js    TEMPORARY, owned by D, replace Tuesday. Do not let this reach Wednesday's review.
  routes/
    index.js        Everything mounts here under /api/v1
    cart.routes.js  B's four cart endpoints (reference implementation)
  controllers/
    cart.controller.js  Thin: parse request, call service, shape response
  services/
    cart.service.js     Business rules live here (quantity validation, ownership checks)
  repositories/
    cart.repository.js  Only file that imports prismaClient for the cart slice
```

## The pattern to copy

Each new feature (products, orders, auth, reviews) should follow the same
five-file shape as cart: `routes/*.routes.js` mounts in `routes/index.js`,
which calls a `controllers/*.controller.js`, which calls a
`services/*.service.js`, which calls a `repositories/*.repository.js`,
which is the only place that imports `prismaClient.js`.

No layer skipping: controllers never call Prisma directly, only services
call repositories, only repositories call Prisma. This is enforced by
convention right now, not by tooling, so it depends on everyone actually
following the cart slice's shape during review.

## Two temporary stubs, both must be replaced this week

- `middleware/auth.stub.js`, D replaces Tuesday with real JWT verification.
  Contract: read the bearer token, verify it, attach `{ id, role }` to
  `req.user`. Nothing downstream should change when this is swapped in.
- `middleware/errorHandler.js`, A replaces Tuesday with the real error
  class hierarchy and Prisma error mapping. The response shape
  (`{ error: { code, message, details? } }`) is locked, don't change it
  without telling everyone.
- `prisma/schema.prisma` is a provisional subset (User, Product, CartItem
  only) so the cart slice could be built and tested Monday night without
  blocking on C. C's Monday-night schema push replaces this file wholesale.

## Tests

```
npm test
```

`cart.service.test.js` mocks the repository and Prisma client entirely,
this is what "controllers/services testable without a real database"
(Milestone 1) looks like in practice. Follow this pattern for new
services rather than hitting a real test database for unit tests;
save real database integration tests for Supertest-level route tests.
