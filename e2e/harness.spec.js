import { test, expect } from "@playwright/test";
import { API_BASE_URL, visit } from "./support/app.js";

/**
 * Proves the end-to-end harness itself works before any journey depends on it
 * (#149). When one of the five journeys fails, this file is what tells you
 * whether the cause is the application or the setup: if these three pass, both
 * servers are up, the base URL resolves to the app, and the database has data
 * in it.
 */
test.describe("end-to-end harness", () => {
  test("the API reports itself ready", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health/ready`);

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      database: "connected",
    });
  });

  test("the client serves the app under its GitHub Pages base path", async ({ page }) => {
    await visit(page);

    // The app renders at all, and it rendered here rather than at the origin
    // root — the mistake the appPath() helper exists to prevent.
    await expect(page.getByRole("link", { name: "One More Game" })).toBeVisible();
    expect(page.url()).toContain("/sen371-boardgame-store/");
  });

  test("the catalogue has seeded products to test against", async ({ page }) => {
    await visit(page, "catalogue");

    await expect(page.getByRole("heading", { name: "Board games" })).toBeVisible();

    // Three of the five journeys are meaningless against an empty catalogue,
    // so this failing with a clear message is worth more than each of them
    // failing separately on a missing element.
    const count = page.locator("a[href*='/products/']");
    await expect(
      count.first(),
      "No products rendered. Seed the database: cd server && npx prisma db seed",
    ).toBeVisible();
  });
});
