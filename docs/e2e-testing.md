# End-to-end testing

Playwright drives a real browser against the real client and the real API, so these tests cover the layer nothing else does: the seams between them. A unit test can prove `createOrder` works and a component test can prove the cart renders, and both can pass while the two never speak to each other.

This is the "user testing" area of the Milestone 5 quality criteria.

## Why the repo root

Playwright is installed at the root rather than inside `client/` or `server/`, and there is a third `package.json` here because of it. A journey spans both halves – "add to cart and check out" is a React page, an Express route and a Postgres row – so a suite owning only one half cannot assert that the journey completed. The root is the only place that sees both.

## Prerequisites

```bash
npm ci                      # at the repo root, for Playwright itself
npx playwright install chromium
```

Chromium only. Cross-browser coverage is not what this milestone assesses, and three browsers would triple the run time for information the project has no plan to act on.

The suite needs a seeded database, because three of the five journeys are meaningless against an empty catalogue:

```bash
cd server && npx prisma db seed
```

## Running

Against local dev servers – Playwright starts both itself and shuts them down afterwards:

```bash
npm run test:e2e
```

Against a deployed environment, where nothing is started for you:

```bash
E2E_BASE_URL=https://jordyisskinny.github.io/sen371-boardgame-store/ \
E2E_API_BASE_URL=https://sen371-boardgame-store-api.onrender.com/api/v1 \
npm run test:e2e
```

Setting `E2E_BASE_URL` also stretches the timeouts, because the first request to a suspended Render free-tier instance pays roughly fifty seconds while it wakes.

Other entry points:

| Command | Use |
|---|---|
| `npm run test:e2e:ui` | Time-travel debugger, watch mode. Best for writing a new spec. |
| `npm run test:e2e:headed` | Watch it happen in a visible browser. |
| `npm run test:e2e:report` | Open the HTML report from the last run. |

## Reading a failure

Traces and screenshots are kept on failure only. A trace holds the DOM, the network log and a screenshot for every step, which is what makes a failure diagnosable afterwards rather than only while watching it:

```bash
npx playwright show-trace test-results/<the-failing-test>/trace.zip
```

`e2e/harness.spec.js` is the first thing to check when a journey fails. It asserts only that the setup works – the API reports ready, the app serves under its base path, the catalogue has products. If those three pass, the failure is in the application rather than the environment.

## The base path trap

`vite.config.js` sets `base: "/sen371-boardgame-store/"` to match GitHub Pages, and `main.jsx` passes the same value to the router as its `basename`. The app is therefore served from a subdirectory even locally.

Playwright resolves navigation with `new URL(path, baseURL)`, and **a leading slash discards the whole path**: `page.goto("/catalogue")` lands on `http://localhost:5173/catalogue`, outside the app, rendering nothing. The failure looks like a missing element rather than a bad URL.

So navigate through the helper, never `page.goto` directly:

```js
import { visit } from "./support/app.js";

await visit(page, "catalogue");   // correct
await page.goto("/catalogue");    // wrong, and fails confusingly
```

## Layout

```
e2e/
  harness.spec.js     the setup works – run this first when something breaks
  support/
    app.js            base URLs, the visit() helper, unique test identities
    api.js            arrangement through the API rather than the UI
```

`support/api.js` exists for arrangement only – creating the account whose order history a test then reads through the browser, for example. The behaviour under test always goes through the UI. Arranging through the API keeps a failure in one journey from being caused by a different journey's screen.

Note that there is no way to inject a session: the access token lives in a module-scoped variable in `client/src/api/client.js` and never in `localStorage` (see `docs/auth-contracts.md`), so there is nowhere for a test to put one. Logging in means driving the real form.

## Test data

Every run registers new accounts with addresses like `e2e-customer-1757800000000-a1b2c3@example.test`. The timestamp is not decoration: against a shared database, a fixed address would collide on the unique constraint and fail every run after the first. The `e2e-` prefix makes the rows this suite created identifiable, which matters because nothing deletes them afterwards.

**These tests write to whichever database the API is pointed at.** Against `server/.env` that is the shared Neon development instance, so a run leaves accounts behind that the rest of the team can see.
