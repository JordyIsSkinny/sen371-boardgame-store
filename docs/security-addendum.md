# Milestone 3 — Security Addendum

Extends `docs/auth-contracts.md` with the access rules for the endpoints added in
Milestone 3. Written before those endpoints exist so they can be built with the
middleware already applied, rather than retrofitted.

---

## 1. Access rules for the new endpoints

Every route below is `/api/v1`-prefixed. Middleware runs left to right.

### Users

| Route | Middleware | Notes |
|---|---|---|
| `GET /users/me` | `authenticate` | Returns the caller only. Never accepts an id. |
| `PUT /users/me` | `authenticate` → `validate` | Caller may change `first_name`, `last_name`, `email` only. |
| `GET /users` | `authenticate` → `authorize('admin')` | Paginated. |
| `GET /users/:id` | `authenticate` → `authorize('admin')` | |

**`role_id` must never be settable through `PUT /users/me`.** If the update
schema permits arbitrary fields, any customer can promote themselves to admin
with one request. Whitelist the three fields explicitly rather than spreading
`req.body` into the Prisma call.

**`password_hash` must never appear in any user response.** `GET /users` returns
a list, so a single missed field exposes every hash in the system. Shape the
response in the repository, as `user.repository.js` already does with
`toDomain()`.

Changing an email address is an account-takeover vector if it can be done with a
stale session. Out of scope for M3, but worth a comment noting that a production
system would re-authenticate first.

### Payments

| Route | Middleware | Notes |
|---|---|---|
| `POST /payments` | `authenticate` → `validate` → ownership check on the order | |
| `GET /payments/:orderId` | `authenticate` → `requireOwnershipOrAdmin` | |

**The amount must come from the order, never from the request body.** If the
client supplies the amount, anyone can pay R1 for a R2000 order. Read
`order.total` server-side and ignore any amount in the payload. This is the
single most important rule in this document.

**A user may only pay for their own order.** Without this, order ids are
sequential integers and anyone can attach a payment to someone else's order.

**Paying twice must fail.** `payments.order_id` is `UNIQUE` in the schema, so the
database will reject it, but the service should return `409 CONFLICT` with a
clear message rather than letting a Prisma `P2002` surface as a 500.

**Order status transitions `pending → paid` only.** An already-paid, shipped,
delivered or cancelled order rejects payment with `409`.

### Inventory

| Route | Middleware | Notes |
|---|---|---|
| `GET /inventory/:productId` | `authenticate` → `authorize('admin')` | |
| `PUT /inventory/:productId` | `authenticate` → `authorize('admin')` → `validate` | |

Stock levels are admin-only per the RBAC matrix in System Plan 8.2. The
customer-facing stock signal is the badge on the product card, which comes from
the product endpoint, not from here.

`quantity_on_hand` has a `CHECK (>= 0)` constraint. Validate for a non-negative
integer before the database has to.

### Orders (completing the set)

| Route | Middleware | Notes |
|---|---|---|
| `GET /orders/all` | `authenticate` → `authorize('admin')` | Distinct path from `GET /orders`, which is the caller's own. |
| `PUT /orders/:id/status` | `authenticate` → `authorize('admin')` → `validate` | Status must be one of the `OrderStatus` enum values. |

### Categories (completing the set)

| Route | Middleware | Notes |
|---|---|---|
| `POST /categories` | `authenticate` → `authorize('admin')` | Currently `GET /categories` is the only category route and it is correctly public. |

---

## 2. `requireOwnershipOrAdmin`

Specified in `docs/auth-contracts.md` but never built. Ownership is currently
enforced in three places with three different behaviours:

| Location | Behaviour |
|---|---|
| `cart.service.js` | Returns 404 for another user's item. Correct. |
| `orders.routes.js` | Returns 403, and has no admin bypass. Two bugs. |
| `review.service.js` | Returns 403, with an admin bypass. Correct for admins. |

Being built in this milestone as `src/middleware/require-ownership.js`, with two
rules:

**Admins pass.** System Plan 8.2 grants admins access to all orders, payments and
reviews. The current orders check has no bypass, so an admin gets 403 on any
order but their own – which breaks the admin dashboard in Milestone 4.

**A resource the caller does not own returns 404, not 403.** A 403 confirms the
resource exists. Since ids are sequential integers, that lets anyone enumerate
how many orders the store has by walking `/orders/1`, `/orders/2` and reading the
status codes. 404 for both "does not exist" and "not yours" leaks nothing. This
is the same reasoning as the generic login failure message in 8.2.

---

## 3. Error responses

Every failure path returns the System Plan 8.3 shape via `next(err)`. No route
builds error JSON by hand – `orders.routes.js` currently does on its 404 path,
which produces a response missing the `status` field.

| Condition | Status | Code |
|---|---|---|
| No or malformed token | 401 | `UNAUTHORIZED` |
| Expired access token | 401 | `TOKEN_EXPIRED` |
| Authenticated, wrong role | 403 | `FORBIDDEN` |
| Authenticated, resource not owned | 404 | `NOT_FOUND` |
| Validation failure | 422 | `VALIDATION_ERROR` |
| Duplicate payment | 409 | `CONFLICT` |
| Rate limit | 429 | `RATE_LIMIT_EXCEEDED` |

---

## 4. CORS

`config.clientOrigin` is currently a single value defaulting to
`http://localhost:5173`. Milestone 4 introduces a second legitimate origin, the
deployed GitHub Pages site, and both need to work simultaneously – a developer
running the client locally against the deployed API is a normal case during
Milestone 4.

Moving to an allowlist read from a comma-separated `CLIENT_ORIGIN`, with
`credentials: true` retained so the refresh cookie is sent. A wildcard origin is
not an option: it is incompatible with credentialed requests, and it would let
any site call the API with the user's cookie attached.

---

## 5. Verification

The criterion is *Security Integration*, so the evidence is tests that prove the
rules hold, not the rules being written down. A Supertest suite covering, for
every protected route:

- unauthenticated request → 401
- customer token on an admin route → 403
- customer requesting another user's resource → 404
- admin requesting another user's resource → 200
- owner requesting their own resource → 200

Plus the two payment-specific cases: a client-supplied amount is ignored, and a
second payment on the same order returns 409.
