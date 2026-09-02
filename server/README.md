# Board Game Store API — Milestone 2 Scaffold

Architecture Implementation (B). Scaffold plus the cart vertical slice as
the reference implementation everyone else's endpoints should structurally
match.

## Running it
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev


Copy `.env.example` to `.env` and fill in real values, including
`JWT_SECRET` and `REFRESH_TOKEN_SECRET`, the app fails at boot without them.

Use `migrate deploy`, not `migrate dev`. C's schema is authoritative; if
everyone runs `migrate dev` locally, we get four different migration files
generated against the same schema and conflict on merge.

## Structure

src/
app.js Express app + full middleware chain, wired once, here only
server.js Entry point, starts the app, handles SIGTERM/SIGINT
config/ Single source of truth for env vars
lib/
prismaClient.js Singleton Prisma client (Milestone 1, Singleton pattern)
errors/ PROVISIONAL copies of A's error classes (PR #26), deleted
wholesale once that PR merges
middleware/
errorHandler.js STUB, owned by A, replaced wholesale once PR #26 merges
notFound.js Catches unmatched routes
authenticate.stub.js TEMPORARY, owned by D, replace ASAP
authorize.stub.js TEMPORARY, owned by D, replace ASAP
routes/
index.js Everything mounts here under /api/v1
cart.routes.js B's four cart endpoints (reference implementation)
controllers/
cart.controller.js Thin: parse request, call service, shape response
services/
cart.service.js Business rules (quantity validation, ownership checks)
repositories/
cart.repository.js Only file that imports prismaClient for the cart slice
product.repository.js PROVISIONAL, matches C's real file (PR #28) naming exactly
models/
cart.model.js Presentation shaping (Decimal -> number, line totals)


## The pattern to copy

Each new feature follows the same shape as cart: routes/*.routes.js
mounts in routes/index.js, calls a controllers/*.controller.js, which
calls a services/*.service.js, which calls a repositories/*.repository.js,
which is the only place that imports prismaClient.js.

No layer skipping: controllers never call Prisma directly, only services
call repositories, only repositories call Prisma.

## Contracts this follows

Error shape, confirmed via System Plan 8.3 and A's real implementation
(PR #26): { status, error, message, details? }, flat, error is a string
code. Everything in this branch throws A's real AppError subclasses, not
plain objects, an earlier version silently converted every 4xx into a 500
because of exactly that mismatch.

Success shape: bare, resource-named object, e.g. { cart: {...} },
{ item: {...} }, matching D's published auth contracts.

Middleware naming (authenticate, authorize) matches D's contract
exactly so swapping in the real implementation is a file-content
replacement, not a rename across every route file.

## Temporary/provisional pieces, all replaced this week

- middleware/authenticate.stub.js, authorize.stub.js, D replaces with
  real JWT verification and role checks. authenticate.stub.js throws at
  import time if NODE_ENV=production, so it can't ship live undetected.
- middleware/errorHandler.js and errors/, replaced wholesale once PR
  #26 merges.
- repositories/product.repository.js, replaced wholesale once PR #28
  merges (matches C's getProductById naming already).
- prisma/schema.prisma, provisional subset (User, Product, CartItem),
  replaced wholesale once C's schema merges.

## Tests

npm test


cart.service.test.js mocks the repository and Prisma client entirely.
Follow this pattern for new services rather than hitting a real test
database for unit tests.
