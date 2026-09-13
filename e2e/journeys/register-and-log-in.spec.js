import { test, expect } from "@playwright/test";
import { visit, uniqueEmail, TEST_PASSWORD } from "../support/app.js";

/**
 * Journey 2 — register, log out, log back in (#150).
 *
 * Everything here goes through the UI, including registration, because the
 * account lifecycle is the subject rather than a precondition. This is the one
 * journey that does not reuse the shared session from auth.setup.js.
 *
 * Written as a single test on purpose. auth.routes.js limits /auth/register
 * and /auth/login together to five requests per minute per IP (System Plan
 * 8.4), so splitting this into one test per step costs a fresh account each
 * time and trips the limiter — which is the application working as specified,
 * not a bug to route around. One test, one account, three credential calls.
 *
 * It also folds in the reload assertion, which is the most valuable one here:
 * the access token lives only in memory, so surviving a reload proves the
 * httpOnly refresh cookie came back and the silent refresh rebuilt the
 * session. That is the exact mechanism that breaks in production when
 * CLIENT_ORIGIN is wrong, and the symptom there is a session that dies after
 * fifteen minutes while login itself appears to work.
 */

async function fillRegistrationForm(page, email) {
  await page.getByLabel("First Name").fill("Ellie");
  await page.getByLabel("Last Name").fill("Tester");
  await page.getByLabel("Email").fill(email);
  // getByLabel("Password") on its own also matches "Confirm Password".
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("Confirm Password").fill(TEST_PASSWORD);
}

test.describe("journey 2: register and log in", () => {
  test("a new customer registers, survives a reload, logs out and logs back in", async ({ page }) => {
    const email = uniqueEmail("journey2");

    await test.step("register", async () => {
      await visit(page, "register");
      await fillRegistrationForm(page, email);
      await page.getByRole("button", { name: "Register" }).click();

      // Registration signs the user straight in, and the nav is the evidence:
      // a Log out control exists only for an authenticated session.
      await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
    });

    await test.step("the session survives a full page reload", async () => {
      await page.reload();
      await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    });

    await test.step("log out", async () => {
      await page.getByRole("button", { name: "Log out" }).click();

      await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Log out" })).toBeHidden();

      // Logging out must not leave the session recoverable. If the refresh
      // cookie survived, reloading would silently sign the user back in —
      // which is the bug logout exists to prevent, and it is invisible
      // without this reload.
      await page.reload();
      await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Log out" })).toBeHidden();
    });

    await test.step("log back in with the same credentials", async () => {
      await visit(page, "login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Log in" }).click();

      await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
    });
  });
});
