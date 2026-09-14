import { test, expect } from "@playwright/test";
import { API_BASE_URL, visit } from "./support/app.js";

/**
 * #154 — health monitoring exists to mitigate Render's free-tier cold start
 * (~50s on the first request after the instance suspends), but the mitigation
 * only works if the client shows something better than a blank screen while
 * that request is in flight. This asserts the catalogue's initial load uses
 * the shared LoadingState component rather than an ad hoc loading paragraph,
 * because LoadingState is what carries the accessible status role — a plain
 * <p> renders visually identical text but announces nothing to a screen
 * reader and gives automated checks nothing to assert against.
 *
 * The network delay is deliberate and load-bearing, not incidental: the
 * loading state on a fast local dev server can resolve before Playwright's
 * next assertion even runs, which would pass or fail this test on timing
 * rather than on whether the right markup renders. Delaying the request
 * removes the race entirely.
 */
test.describe("loading states (#154)", () => {
  test("the catalogue shows an accessible loading state while products are still loading", async ({ page }) => {
    await page.route(`${API_BASE_URL}/products*`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await visit(page, "catalogue");

    // role="status" + aria-live="polite" is LoadingState.jsx's contract
    // (see the component) — this is what distinguishes it from any other
    // element that happens to contain the word "Loading".
    await expect(page.getByRole("status")).toBeVisible();

    // And it actually clears once the delayed response lands, rather than
    // being stuck content that happened to also be present at page load.
    await expect(page.getByRole("status")).toBeHidden({ timeout: 10_000 });
    await expect(page.locator("a[href*='/products/']").first()).toBeVisible();
  });
});
