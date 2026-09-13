/**
 * Shared helpers for the end-to-end specs.
 */

// The client talks to the API through VITE_API_BASE_URL, baked in at build
// time. The specs need the same value for setup that goes straight to the API
// rather than through the UI, and for asserting the RBAC negative case in the
// admin journey — a 403 from the API is the actual security boundary, where
// the hidden nav link is only the cosmetic half of it.
export const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? "http://localhost:3000/api/v1";

/**
 * Satisfies the registration policy enforced in password.service.js and
 * mirrored in Register.jsx: at least eight characters, an uppercase letter, a
 * lowercase letter and a digit.
 */
export const TEST_PASSWORD = "E2eTestPass1";

/**
 * Every run registers new accounts, and against a shared database the same
 * address twice would collide on the unique constraint and fail the second
 * run rather than the first. The e2e- prefix also makes the rows this suite
 * created identifiable later, which matters because nothing deletes them.
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
