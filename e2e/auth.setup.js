import fs from "node:fs";
import { test as setup, expect } from "@playwright/test";

import { TEST_PASSWORD } from "./support/app.js";
import { registerCustomer } from "./support/api.js";
import { AUTH_DIR, SHARED_CUSTOMER } from "./support/sessions.js";

/**
 * Registers one customer per run and records its credentials for the journeys
 * that need to be signed in as somebody.
 *
 * One account, not one per test, because auth.routes.js rate limits
 * /auth/register and /auth/login together at five requests per minute per IP
 * (System Plan 8.4) — deliberately, since repeated registration is how an
 * attacker probes which emails exist. A suite that registered per test
 * exhausted that budget and failed with "Too many attempts. Try again in a
 * minute.", which is the application behaving exactly as specified.
 *
 * Only registration happens here. Sessions are not stored and replayed: see
 * the note in support/sessions.js and #176.
 *
 * Journey 2 ignores this account entirely and registers its own through the
 * form, because the account lifecycle is what that journey tests.
 */
setup("register the shared customer", async ({ request }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const customer = await registerCustomer(request, "shared");

  expect(customer.user.role).toBe("customer");

  fs.writeFileSync(
    SHARED_CUSTOMER,
    JSON.stringify({ email: customer.email, password: TEST_PASSWORD }, null, 2),
  );
});
