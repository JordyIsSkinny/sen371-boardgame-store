import path from "node:path";

/**
 * Where auth.setup.js records the account the journeys share.
 *
 * In its own module rather than in auth.setup.js because Playwright refuses to
 * let one test file import another, and auth.setup.js is a test file — it runs
 * as the "setup" project the chromium project depends on.
 *
 * Note what is *not* here: a saved storageState. Restoring a session from a
 * stored refresh cookie does not work against this application (#176) — the
 * unguarded silent refresh races itself on mount, and when the losing call
 * presents an already-rotated token the server treats it as theft and revokes
 * every token for that user, so the stored cookie is dead for good rather than
 * merely stale. The journeys log in through the form instead.
 */
export const AUTH_DIR = path.join("e2e", ".auth");

export const SHARED_CUSTOMER = path.join(AUTH_DIR, "shared-customer.json");
