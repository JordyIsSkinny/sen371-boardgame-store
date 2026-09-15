import fs from "node:fs";
import { expect, test } from "@playwright/test";

import { SHARED_CUSTOMER } from "./sessions.js";

/**
 * Shared helpers for the end-to-end specs.
 */

// The client talks to the API through VITE_API_BASE_URL, baked in at build
// time. The specs need the same value for setup that goes straight to the API
// rather than through the UI, and for asserting the RBAC negative case in the
// admin journey — a 403 from the API is the actual security boundary, where a
// hidden nav link is only the cosmetic half of it.
export const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? "http://localhost:3000/api/v1";

/**
 * Satisfies the registration policy enforced in password.service.js and
 * mirrored in Register.jsx: at least eight characters, an uppercase letter, a
 * lowercase letter and a digit.
 */
export const TEST_PASSWORD = "E2eTestPass1";

/**
 * Every run registers a new account, and against a shared database a fixed
 * address would collide on the unique constraint and fail every run after the
 * first. The e2e- prefix also makes the rows this suite created identifiable,
 * which matters because nothing deletes them.
 */
export function uniqueEmail(prefix = "customer") {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${prefix}-${stamp}@example.test`;
}

/**
 * Guards the leading-slash trap documented in playwright.config.js. The app is
 * served under /sen371-boardgame-store/ to match GitHub Pages, and
 * `new URL("/catalogue", base)` discards that prefix, so an absolute path
 * navigates outside the application and renders a blank page. Routing every
 * navigation through here means a stray slash cannot silently do that.
 */
export function appPath(path = "") {
  return path.replace(/^\/+/, "");
}

export async function visit(page, path = "") {
  await page.goto(appPath(path));
}

/**
 * Credentials for the one account the suite cannot create for itself.
 *
 * Registration hardcodes role: 'customer' in auth.service.js — deliberately,
 * so nobody can self-promote through the public endpoint — and no endpoint
 * changes a role afterwards. An admin therefore has to pre-exist, and its
 * password cannot live in the repository.
 *
 * Supplied through the gitignored root .env locally, or as repository secrets
 * in CI. When absent the admin half of journey 5 skips with an explanatory
 * message rather than failing, so the suite stays green for someone who does
 * not have them. The negative half — the part that demonstrates the RBAC
 * boundary — needs no credentials and always runs.
 */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
export const hasAdminCredentials = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

/** The account auth.setup.js registered for this run. */
export function readSharedCustomer() {
  return JSON.parse(fs.readFileSync(SHARED_CUSTOMER, "utf8"));
}

/**
 * Signs in through the login form.
 *
 * Every journey establishes its session this way rather than restoring a saved
 * storageState, because a stored session does not survive this application's
 * refresh-token rotation: the silent refresh on mount is not single-flight and
 * races itself, and when the losing call presents an already-rotated token the
 * server treats it as theft and revokes every token for that user (#176).
 *
 * The corollary shapes the journeys. Once signed in, navigate by clicking
 * links rather than calling visit(), because a full page load remounts
 * AuthContext and re-runs that race. Clicking is what a real user does anyway,
 * so nothing is lost.
 *
 * One retry on the rate limiter. /auth/login allows five credential requests
 * per minute per IP and a full run makes several, so a run can legitimately
 * hit it. Waiting and retrying is what a real user does; it is not masking a
 * defect, since the limit is specified behaviour (System Plan 8.4).
 */
export async function signIn(page, email, password = TEST_PASSWORD) {
  await visit(page, "login");

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    const signedIn = page.getByRole("button", { name: "Log out" });
    const error = page.getByRole("alert");

    await expect(signedIn.or(error).first()).toBeVisible();

    if (await signedIn.isVisible()) return;

    const message = (await error.textContent()) ?? "";

    if (!message.includes("Too many attempts") || attempt === 2) {
      throw new Error(`Could not sign in as ${email}: ${message}`);
    }

    // Extends *this test's* timeout, not just the wait: a full-suite run
    // makes enough credential calls across files that the limiter can still
    // be within its window from a journey that ran moments earlier, and the
    // default 60s test timeout is otherwise shorter than the 60s window this
    // is waiting out. test.setTimeout() only takes effect on the test
    // currently running, so a spec that never needs the retry keeps its
    // normal timeout.
    test.setTimeout(test.info().timeout + 75_000);

    // A little over the sixty-second window, to avoid retrying right on its
    // boundary and hitting the limiter again immediately.
    await page.waitForTimeout(65_000);
  }
}
