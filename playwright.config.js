import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration. This lives at the repo root, not in client/ or
 * server/, because a journey crosses both: "add to cart and check out" is a
 * React page, an Express route and a Postgres row, and a test that owns only
 * one half of that cannot assert the journey completed.
 *
 * Run against a local pair of dev servers (the default) or against the
 * deployed system:
 *
 *   npm run test:e2e
 *   E2E_BASE_URL=https://jordyisskinny.github.io/sen371-boardgame-store/ \
 *   E2E_API_BASE_URL=https://sen371-boardgame-store-api.onrender.com/api/v1 \
 *   npm run test:e2e
 *
 * E2E_BASE_URL alone falls back to the local API for direct state
 * arrangement and the RBAC assertion (see support/app.js), which is wrong
 * against the deployed frontend — both variables are needed together.
 */

// The trailing slash is load-bearing and so is the path. vite.config.js sets
// base: "/sen371-boardgame-store/" to match GitHub Pages, and main.jsx passes
// that same value to the router as its basename, so the app is served from a
// subdirectory even locally.
//
// Consequence for every spec: navigate with a RELATIVE path and no leading
// slash — page.goto("catalogue"), never page.goto("/catalogue"). Playwright
// resolves the URL with `new URL(path, baseURL)`, and a leading slash
// replaces the whole path, landing on http://localhost:5173/catalogue, which
// is outside the app and renders nothing.
const DEFAULT_BASE_URL = "http://localhost:5173/sen371-boardgame-store/";

const baseURL = process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL;

// When a base URL is supplied, something else is already serving the app —
// a deployed environment, or servers the developer started themselves — so
// starting our own would bind ports for no reason and fail.
const isRemote = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",

  // Deliberately serial. These tests share one API process, one browser
  // profile and one database, and the database is Neon's free tier, which
  // caps simultaneous connections. Parallel workers would also interleave
  // cart mutations for the same user, producing failures that look like
  // application bugs and are not reproducible in isolation.
  fullyParallel: false,
  workers: 1,

  // A failing assertion must not be able to pass on a second attempt in a
  // milestone whose point is evidence, so no retries locally. In CI one
  // retry absorbs genuine flake — a cold start, a slow runner — without
  // hiding a real failure, because the report still marks it flaky.
  retries: process.env.CI ? 1 : 0,

  // Render's free tier suspends after about fifteen minutes idle and takes
  // roughly fifty seconds to wake. The first navigation of a run against the
  // deployed system pays that, so the timeouts are sized for it rather than
  // for localhost.
  timeout: isRemote ? 120_000 : 60_000,
  expect: { timeout: 15_000 },

  forbidOnly: Boolean(process.env.CI),

  reporter: [
    ["list"],
    // open: "never" so a failing run in CI does not try to launch a browser.
    // The report is the artefact the Test Report (#140) cites.
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL,

    // Both retained only on failure. A trace is a few megabytes and holds the
    // DOM, network log and a screenshot per step, which is what makes a
    // failure diagnosable after the fact rather than only while watching it.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",

    // Video is deliberately off: it needs Playwright's bundled ffmpeg, and
    // the trace already carries a screenshot for every step.
    video: "off",

    actionTimeout: 15_000,
    navigationTimeout: isRemote ? 90_000 : 30_000,
  },

  // Chromium only. Cross-browser coverage is not what this milestone is
  // assessed on, and three browsers would triple the run time for
  // information the project has no plan to act on.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Two servers, because the journeys need both halves. The API entry gates
  // on the readiness endpoint rather than the port being open: Prisma
  // connects lazily, so the port accepts connections slightly before the
  // database does, and the first test would otherwise race the connection.
  webServer: isRemote
    ? undefined
    : [
        {
          command: "npm run dev",
          cwd: "server",
          url: "http://localhost:3000/api/v1/health/ready",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: "npm run dev",
          cwd: "client",
          url: DEFAULT_BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
      ],
});
