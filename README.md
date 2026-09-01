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

Copy the environment template and fill in your own values:

```bash
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

Health check: `GET http://localhost:3000/api/health`

## Testing

```bash
cd server && npm test        # API unit and integration tests
cd client && npm test        # component tests
```

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

## Documentation

Full system plan, ERD, API specification and deployment plan are in [`docs/`](./docs).