# Authentication Endpoint Contracts

Base path: `/api/v1`

---

## Schema dependency

Auth depends on `roles` and `users` (System Plan 5.2) plus one table the System Plan does not yet contain:

```
refresh_tokens
  id           SERIAL         PRIMARY KEY
  user_id      INTEGER        FK -> users(id) ON DELETE CASCADE, NOT NULL
  token_hash   VARCHAR(255)   UNIQUE NOT NULL
  expires_at   TIMESTAMPTZ    NOT NULL
  revoked_at   TIMESTAMPTZ    NULL
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
  INDEX (user_id)
```

**Why it is required.** Section 8.2 specifies 7-day refresh tokens and a `/auth/logout` that invalidates them. A stateless JWT cannot be revoked, so logout, rotation and reuse detection are all unimplementable without server-side storage.

**Why hashed.** If the database is ever exposed, raw refresh tokens would be usable sessions. Hashes are not.

`roles` is seeded with `guest`, `customer`, `admin`. No user row ever carries `guest`– an unauthenticated visitor has no user row at all. The role exists in the lookup table for completeness of the RBAC model in 8.2.

---

## Token strategy (System Plan 8.2)

| Token | Expiry | Storage | Purpose |
|---|---|---|---|
| Access | 15 min | Client memory (React state) | Sent as `Authorization: Bearer <token>` on every request |
| Refresh | 7 days | `httpOnly` cookie; hashed in `refresh_tokens` | Only ever sent to `/auth/refresh` |

**Payload claims:** `sub` (user id), `role`, `email`, `iat`, `exp` – as specified in 8.2. A JWT is signed but not encrypted, so everything in the payload is publicly readable; nothing beyond these fields goes in.

**Cookie attributes:** `httpOnly; Secure; SameSite=None; Path=/api/v1/auth`

> **Correction to System Plan 8.2**, which specifies `SameSite=Strict`. The client is served from `github.io` and the API from `onrender.com`, which browsers treat as cross-site. A `Strict` cookie would never be transmitted, so `/auth/refresh` would fail for every user in production while working correctly on localhost. `None` with `Secure` is required, paired with CORS `credentials: true` and an origin restricted to `CLIENT_ORIGIN`.

**Access token in memory** means it is lost on page refresh, requiring a silent refresh call on application load. This is deliberate – `localStorage` is readable by any injected script.

**Password hashing:** bcrypt, cost factor 12 (8.2 permits 10–12).

**Password policy:** minimum 8 characters, at least one uppercase, one lowercase, one digit. Must match the rule checklist on wireframe S6 (9.2).

---

## Error response format (System Plan 8.3)

```json
{
  "status": 422,
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [{ "field": "email", "issue": "must be a valid email address" }]
}
```

`details` is omitted when there are no field-level errors. Validation failures return **422**, not 400.

---

## POST /auth/register

**Request**

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "password": "Passw0rd123"
}
```

**201 Created**

```json
{
  "user": {
    "id": 1,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "role": "customer"
  },
  "accessToken": "eyJhbGci..."
}
```

Sets the refresh cookie. `password_hash` is never returned. New accounts are assigned the `customer` role.

| Status | Error code | Cause |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing field, malformed email, password fails policy |
| 409 | `EMAIL_IN_USE` | Email already registered |
| 429 | `RATE_LIMIT_EXCEEDED` | More than 5 requests per minute per IP |

---

## POST /auth/login

**Request**

```json
{ "email": "jane@example.com", "password": "Passw0rd123" }
```

**200 OK** – same body shape as register; sets the refresh cookie.

| Status | Error code | Cause |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing or malformed fields |
| 401 | `UNAUTHORIZED` | Wrong password **or** unknown email |
| 429 | `RATE_LIMIT_EXCEEDED` | More than 5 requests per minute per IP |

**One message for both failure cases**, per 8.2. Distinguishing "no such user" from "wrong password" turns the endpoint into an account enumeration tool. Compare against a dummy hash when the email is unknown, so response timing does not leak the answer either.

---

## POST /auth/refresh

**Request** – no body; the refresh token is read from the cookie.

**200 OK**

```json
{ "accessToken": "eyJhbGci..." }
```

Issues a new refresh cookie and sets `revoked_at` on the old token (rotation).

| Status | Error code | Cause |
|---|---|---|
| 401 | `REFRESH_TOKEN_MISSING` | No cookie present |
| 401 | `REFRESH_TOKEN_INVALID` | Not found, expired, or hash mismatch |
| 401 | `REFRESH_TOKEN_REVOKED` | Already rotated or explicitly revoked |

**Reuse detection.** A revoked token presented again indicates replay or theft. Response: revoke every refresh token for that user, forcing full re-authentication.

---

## POST /auth/logout

**Request** – no body. Requires a valid access token.

**204 No Content** – sets `revoked_at` on the current refresh token and clears the cookie.

| Status | Error code | Cause |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid access token |

---

## GET /users/me

Per the System Plan endpoint table (8.1), current-user retrieval lives under `/users`, not `/auth`.

**Request** – `Authorization: Bearer <accessToken>`

**200 OK**

```json
{
  "user": {
    "id": 1,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "role": "customer"
  }
}
```

| Status | Error code | Cause |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed or expired token |

`PUT /users/me` (profile update, FR-C13) uses the same authentication middleware but belongs to the user module rather than auth.

---

## Middleware

**`authenticate`** – extracts the Bearer token, verifies signature and expiry, loads the user with their role, attaches `{ id, role }` to `req.user`. Rejects with 401 `UNAUTHORIZED`.

**`authorize(...roles)`** – runs after `authenticate`, checks `req.user.role` against the allowed list. Rejects with 403 `FORBIDDEN`.

The 401/403 distinction matters: 401 means *we do not know who you are*, 403 means *we know, and you are not permitted*.

**`requireOwnershipOrAdmin`** – for resources scoped to their owner (cart, orders, own reviews) per the RBAC matrix in 8.2. Permits the resource owner or any admin; rejects others with 403 `FORBIDDEN`.

**`requirePurchase`** – for review creation. Enforces the verified-purchase rule referenced in 3.2 by confirming a delivered order exists containing that product. Rejects with 403 `PURCHASE_REQUIRED`.

---

## RBAC application (System Plan 8.2)

| Route group | Middleware chain |
|---|---|
| `GET /products`, `GET /categories` | none – public |
| `POST/PUT/DELETE /products`, `/categories`, `/inventory` | `authenticate` → `authorize('admin')` |
| `/cart/*` | `authenticate` → `authorize('customer','admin')` |
| `GET /orders`, `POST /orders` | `authenticate` |
| `GET /orders/:id` | `authenticate` → `requireOwnershipOrAdmin` |
| `GET /orders/all`, `PUT /orders/:id/status` | `authenticate` → `authorize('admin')` |
| `POST /products/:id/reviews` | `authenticate` → `requirePurchase` |
| `DELETE /reviews/:id` | `authenticate` → `requireOwnershipOrAdmin` |

---

## Security hardening (System Plan 8.4)

| Measure | Detail |
|---|---|
| Password hashing | bcrypt, cost factor 12 |
| Rate limiting – general | 100 requests per minute per IP |
| Rate limiting – auth | 5 requests per minute per IP on `/auth/login` and `/auth/register` |
| Rate limit response | 429 `RATE_LIMIT_EXCEEDED` |
| Headers | `helmet()` with defaults |
| CORS | Origin restricted to `CLIENT_ORIGIN`, `credentials: true` |
| Payload size | JSON body limit 100kb |
| Secrets | `JWT_SECRET` and `REFRESH_TOKEN_SECRET` must be different values |

Server-side validation is authoritative; client-side validation is UX only (8.5).

---
