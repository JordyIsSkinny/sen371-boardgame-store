import { test, expect } from "@playwright/test";
import {
  API_BASE_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  hasAdminCredentials,
  signIn,
  visit,
} from "../support/app.js";
import { registerCustomer } from "../support/api.js";

/**
 * Journey 5 — admin sees management controls a customer does not (#150).
 *
 * This is the journey that demonstrates the RBAC work from M3, so the
 * negative case is the one that matters most, and it needs no special
 * credentials: any freshly registered account is a customer, since
 * auth.service.js hardcodes role: 'customer' on registration and nothing lets
 * a client change its own role afterwards. That is also what makes the
 * negative case unconditional — it runs on every machine, with or without an
 * admin account.
 *
 * The positive half needs a pre-existing admin, because no endpoint grants
 * that role. Supplied via E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (see
 * support/app.js and docs/e2e-testing.md); a developer without them still
 * gets a fully green run, just without that one test having executed.
 *
 * The negative case is written as one test with test.step rather than three
 * separate tests, and the API check reuses the token from registration rather
 * than logging in again. Both are the same constraint: auth.routes.js limits
 * /auth/register and /auth/login together to five requests per minute per IP
 * (System Plan 8.4), and this file already spends two of those on the two
 * describe blocks — a third case that logged in on its own would risk tripping
 * the limiter on a run that also exercises journeys 2, 3 and 4.
 */
test.describe("journey 5: admin product management", () => {
  test.describe("negative case: a customer is denied admin access", () => {
    test("a customer cannot see or use any admin control", async ({ page, request }) => {
      let customer;

      await test.step("register a plain customer account", async () => {
        customer = await registerCustomer(request, "j5customer");
        expect(customer.user.role).toBe("customer");
      });

      await test.step("the nav has no Admin link", async () => {
        await signIn(page, customer.email, customer.password);
        await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
      });

      await test.step("visiting /admin directly redirects away rather than rendering the dashboard", async () => {
        // visit(), because the point is what happens when the URL is entered
        // directly, which is a full navigation. That remounts AuthContext and
        // re-runs the refresh race in #176, so on the unlucky ordering this
        // can land on /login rather than prove anything about the admin
        // guard — a false result either way, not evidence the guard is
        // broken. One retry (a fresh sign-in, no extra credential cost beyond
        // this test's own budget) tells the two apart.
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          await visit(page, "admin");

          if (page.url().endsWith("/login")) {
            if (attempt === 2) {
              throw new Error("Lost the session on both attempts navigating to /admin — see #176");
            }
            await signIn(page, customer.email, customer.password);
            continue;
          }

          break;
        }

        // AdminRoute (context/AuthContext.jsx) redirects a non-admin to "/"
        // rather than rendering a 403 page or the dashboard underneath — the
        // client-side half of the boundary.
        await expect(page).not.toHaveURL(/\/admin$/);
        await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
      });

      await test.step("the API itself refuses the admin endpoint with 403, not just the UI", async () => {
        // The real security boundary. A hidden nav link is cosmetic on its
        // own — anyone can call the API directly — so this is the assertion
        // that actually demonstrates the RBAC middleware from M3 rather than
        // the page that happens to route around it. Reuses the token from
        // registration instead of logging in again, since that token is
        // already a valid customer session and a second /auth/login call
        // would spend more of this run's shared rate-limit budget for no
        // extra coverage.
        const response = await request.get(`${API_BASE_URL}/orders/all`, {
          headers: { Authorization: `Bearer ${customer.accessToken}` },
        });

        expect(response.status()).toBe(403);
        expect((await response.json()).error).toBe("FORBIDDEN");
      });
    });
  });

  test.describe("positive case: an admin manages products", () => {
    test.skip(
      !hasAdminCredentials,
      "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are not set — add them to the gitignored root .env to run this test. See docs/e2e-testing.md.",
    );

    test("an admin sees the dashboard, the Admin nav link, and can add a product", async ({ page }) => {
      await test.step("sign in as the admin", async () => {
        await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
        await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
      });

      await test.step("open the dashboard", async () => {
        await page.getByRole("link", { name: "Admin" }).click();

        await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
        // Controls a customer never sees at all, not just a page they are
        // blocked from — the stat cards and the products table are markup a
        // customer's account cannot even reach.
        await expect(page.getByText("Total products")).toBeVisible();
        await expect(page.getByRole("button", { name: "+ Add product" })).toBeVisible();
      });

      await test.step("add a new product", async () => {
        const title = `E2E Test Game ${Date.now()}`;
        const slug = `e2e-test-game-${Date.now()}`;

        await page.getByRole("button", { name: "+ Add product" }).click();

        await page.getByPlaceholder("Title").fill(title);
        await page.getByPlaceholder("Slug").fill(slug);
        await page.getByPlaceholder("Min players").fill("2");
        await page.getByPlaceholder("Max players").fill("4");
        await page.getByPlaceholder("Play time (minutes)").fill("60");
        await page.getByPlaceholder("Minimum age").fill("10");
        await page.getByPlaceholder("Complexity (0-5)").fill("2.5");
        await page.getByPlaceholder("Price").fill("399.99");
        await page.getByPlaceholder("Initial stock").fill("10");

        await page.getByRole("button", { name: "Add product" }).click();

        // The form closes and the new row appears in the table below — the
        // product actually persisted through the admin-only POST /products,
        // not just that the form accepted input.
        await expect(page.getByRole("button", { name: "+ Add product" })).toBeVisible();
        await expect(page.getByText(title)).toBeVisible();
      });
    });
  });
});
