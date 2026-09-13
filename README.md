# SEN371 — Board Game Store

Full-stack e-commerce web application for a single-seller board game retailer, built for Software Engineering 371 at Belgium Campus.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, React Router, Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT access + refresh tokens |
| Testing | Vitest, Supertest, Playwright |
| Hosting | GitHub Pages (client) · Render (API) · Neon (database) |

## Design

High-fidelity prototype and component library: [Figma](https://www.figma.com/design/9jaB1VepWpkM3Anp6xI4V5/SEN371-%E2%80%93-Board-Game-Store?node-id=65-6&t=wRJR2kw9014NKdgM-1) (view-only). Design tokens are documented in [`docs/design-system.md`](docs/design-system.md) and implemented as Tailwind's `@theme` block in `client/src/index.css` — where the two disagree, Figma is the source of truth.

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- PostgreSQL 16 running locally, or a Neon connection string
- Git

## Setup

Clone the repository and move into it:

```bash
git clone https://github.com/JordyIsSkinny/sen371-boardgame-store.git
cd sen371-boardgame-store
```

Install dependencies for each half of the project:

```bash
cd server && npm install
cd ../client && npm install
cd ..
```

Copy the environment template and fill in your own values. It needs to exist
in **two** places — once at the repo root (Vite reads the client's
`VITE_API_BASE_URL` from there, not from inside `client/` — see
`client/vite.config.js`'s `envDir`), and once inside `server/` for the API's
own vars:

```bash
cp .env.example .env
cp .env.example server/.env
```

Generate the two token secrets — they must be different from each other:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Apply the database schema and load seed data:

```bash
cd server
npx prisma migrate dev
npx prisma db seed
```

## Running

Two terminals:

```bash
# terminal 1 — API on http://localhost:3000
cd server && npm run dev
```

```bash
# terminal 2 — client on http://localhost:5173
cd client && npm run dev
```

The API exposes two health endpoints, and the difference matters when
something is broken:

| Endpoint | Answers | Touches the database |
|---|---|---|
| `GET /api/v1/health` | Is the process running? | No |
| `GET /api/v1/health/ready` | Can it serve traffic? | Yes, `SELECT 1` |

```bash
curl http://localhost:3000/api/v1/health/ready
```

Readiness answers `200` with `"database": "connected"`, or `503` with
`"status": "degraded"` when the database is unreachable. Liveness stays `200`
either way — Render restarts an instance whose liveness check fails, and
restarting the API cannot repair a database.

## Testing

```bash
cd server && npm test        # API unit and integration tests
```

The client has no automated test runner configured — frontend changes are
verified manually against a running dev server rather than with component
tests.

## Deployment

| Piece | Host | Deployed by |
|---|---|---|
| Client | GitHub Pages | `.github/workflows/deploy-pages.yml`, on pushes touching `client/**` |
| API | Render | `.github/workflows/deploy-server.yml`, on pushes touching `server/**` |
| Database | Neon | `prisma migrate deploy`, inside Render's build command |

Both workflows also accept a manual run (Actions > the workflow > Run
workflow), which is how you redeploy without an empty commit.

### Creating the Render service

Done once, by hand. `render.yaml` holds the build command, start command and
health check path so they are reviewable in the repository rather than living
only in a dashboard.

1. In Render, **New > Blueprint** and select this repository. Render reads
   `render.yaml` and proposes the service: root directory `server`, free plan,
   Frankfurt region, health check `/api/v1/health`.
2. Render prompts for the variables marked `sync: false` — the two database
   URLs, the two token secrets, and `CLIENT_ORIGIN`. Fill them in from
   `.env.example`, with **production** values, not the local ones.
3. Copy the service URL (`https://<name>.onrender.com`). It is needed twice
   more, in steps 4 and 6.
4. **Settings > Deploy Hook** on the service, copy the URL, and add it to
   GitHub as the repository secret `RENDER_DEPLOY_HOOK_URL` (Settings >
   Secrets and variables > Actions > Secrets). It is a secret because anyone
   holding the URL can trigger a deploy.
5. Add the repository **variable** `RENDER_API_URL` (same page, Variables tab)
   set to the service URL with no trailing slash. A variable rather than a
   secret so the deploy log shows which host it polled.
6. Add the repository variable `VITE_API_BASE_URL` set to
   `https://<name>.onrender.com/api/v1`, then re-run the Pages workflow. The
   client build bakes this in at build time, so until it is set and the client
   is rebuilt, the deployed site loads but every API call fails.

If the service was created by hand instead of from the Blueprint, `render.yaml`
does not retroactively reconfigure it — set the dashboard fields to match the
file.

### Production environment variables

Nine variables, set in three different places. The middle column is the one
to get right — putting a secret in `render.yaml` would commit it, and setting
`PORT` by hand breaks the service.

| Variable | Set in | Production value |
|---|---|---|
| `DATABASE_URL` | Render dashboard | Neon **pooled** connection string |
| `DIRECT_URL` | Render dashboard | Neon **direct** connection string |
| `JWT_SECRET` | Render dashboard | Fresh 64-character random hex |
| `REFRESH_TOKEN_SECRET` | Render dashboard | Fresh, and different again |
| `CLIENT_ORIGIN` | Render dashboard | `https://jordyisskinny.github.io` |
| `NODE_ENV` | `render.yaml` | `production` |
| `JWT_EXPIRES_IN` | `render.yaml` | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | `render.yaml` | `7d` |
| `PORT` | Render, automatically | Do not set it |

**The two database URLs are not interchangeable.** `DATABASE_URL` takes the
pooled string (the host containing `-pooler`) because Prisma opens a
connection pool per instance and Neon's free tier caps direct connections.
`DIRECT_URL` takes the unpooled one because `prisma migrate deploy`, which runs
in Render's build command, needs a session it can hold open — run through the
pooler it fails partway, and a half-applied migration is the worst outcome
available. `schema.prisma` already declares both.

**Generate the two secrets fresh rather than copying them out of a local
`.env`.** The development secrets exist in four working copies and a synced
OneDrive folder; reusing one means a token minted on any of those machines is
valid against production. `config/index.js` refuses to start if the two match
each other, but nothing can detect that they were reused.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**`NODE_ENV=production` is load-bearing, not cosmetic.** It is what sets
`Secure` and `SameSite=None` on the refresh cookie in `auth.controller.js`,
without which the cross-site cookie is rejected outright by the browser. It
also drops Prisma's query logging, which would otherwise write every query to
Render's logs.

Changing any variable in the Render dashboard restarts the service on its own;
no redeploy is needed. Point `DATABASE_URL` at a database whose migrations
have not been applied, though, and the restart succeeds while every request
fails — the build step that runs migrations does not re-run on a restart.

### CLIENT_ORIGIN

This is the variable that fails quietly rather than loudly, so it is worth
getting right first time. It must be the GitHub Pages **origin**:

```
CLIENT_ORIGIN="https://jordyisskinny.github.io"
```

Not `https://jordyisskinny.github.io/sen371-boardgame-store/`. An origin is
scheme, host and port only — a browser's `Origin` header never includes the
path, so a value with the repository path in it matches nothing and the
allowlist in `src/app.js` rejects every request from the deployed client.

The symptom is specific and misleading: the client is served from `github.io`
and the API from `onrender.com`, which browsers treat as cross-site, so the
refresh cookie is issued `SameSite=None; Secure`. Get the origin wrong and
login still appears to succeed — the access token is returned and held in
memory — but the refresh cookie is never sent back, so the session dies
silently after fifteen minutes and works perfectly on localhost the whole
time.

Multiple origins are allowed, comma-separated, which is what lets a developer
run the client locally against the deployed API.

### What the deploy workflow does

Render's own auto-deploy is off (`autoDeploy: false`) because it cannot filter
by path and would restart the API for every client-only commit, each one
costing a free-tier cold start. Instead the workflow:

1. Fails early if `RENDER_DEPLOY_HOOK_URL` or `RENDER_API_URL` is missing.
2. POSTs the deploy hook. Render then builds from `main` itself — the runner
   does not upload anything.
3. Polls `/api/v1/health/ready` for up to fifteen minutes, and accepts the
   deploy only once an instance answers `200` **and** reports an `uptime`
   shorter than the time since the hook fired. On the free tier the old
   instance keeps serving while the new one builds, so a bare `200` can be the
   previous release answering; a shorter uptime proves the process restarted.

When a deploy fails, the Render build log is the place to look rather than the
Actions log — a failing `prisma migrate deploy` fails the build, so the API
never restarts and the workflow only ever sees the old instance.

### Free-tier cold starts

Render suspends a free service after roughly fifteen minutes idle, and the
next request pays around fifty seconds while it wakes. This is expected, not a
fault. Before recording the presentation or demonstrating the live system, hit
the readiness endpoint once and wait for `200` first.

## Project structure

```
client/src/          React application
server/src/
  routes/            endpoint definitions
  controllers/       request handling
  services/          business logic
  repositories/      data access
  middleware/        auth, validation, error handling
  models/            domain models
  config/            environment and app configuration
server/prisma/       schema, migrations, seed data
docs/                ERD, architecture diagrams, API specification
```

Controllers never access the database directly — they call services, which use repositories.

## Contributing

Branch from an up-to-date `main`. Never commit to `main` directly.

**Branch naming:** `<type>/<issue-key>-<description>` — e.g. `feature/SEN371-14-product-filters`
Types: `feature` `bugfix` `hotfix` `test` `docs` `chore`

**Commits** follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat(server): add cart line item endpoint

Closes #14
```

Types: `feat` `fix` `test` `refactor` `docs` `style` `chore`
Scopes: `client` `server` `db` `auth` `api` `ci`

**Pull requests** require one approving review, or two for changes to authentication or the database schema. All status checks must pass. Merges are squash-only, and no one approves their own work.

Tests are written before implementation, following the Red–Green–Refactor cycle.

## Team

| Member | Role |
|---|---|
| Masindi Lukoto (602729) | Requirements, process, testing |
| Miles Mohale Pieterse (602327) | Architecture, integration |
| Ipeleng Ntjana (601745) | Database, API |
| Jordann Heunis (603115) | UI/UX, security, DevOps |
