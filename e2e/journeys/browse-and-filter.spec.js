import { test, expect } from "@playwright/test";
import { visit } from "../support/app.js";

/**
 * Journey 1 — browse and filter the catalogue (#150).
 *
 * Guest-accessible, so no account setup. What this proves that a component
 * test cannot: the filter controls do not merely update React state, they
 * reach GET /products as query parameters and the grid re-renders from the
 * response. Catalogue.jsx has filters on both sides of that line — category
 * and player count re-fetch, while age rating, complexity and price are
 * local-only until #75 — so this covers the two that are wired.
 */

const gamesCount = (page) => page.getByText(/^\d+ games$/);

async function readCount(page) {
  const text = await gamesCount(page).textContent();
  return Number(text.replace(/\D/g, ""));
}

const productLinks = (page) => page.locator("a[href*='/products/']");

/**
 * The hrefs of the cards currently rendered. Identity rather than title text:
 * a product's href is stable, and comparing sets is what distinguishes "the
 * grid re-rendered" from "the same results came back".
 */
async function renderedProductHrefs(page) {
  return productLinks(page).evaluateAll((links) => links.map((link) => link.getAttribute("href")));
}

test.describe("journey 1: browse and filter", () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, "catalogue");
    await expect(page.getByRole("heading", { name: "Board games" })).toBeVisible();
    await expect(productLinks(page).first()).toBeVisible();
  });

  test("the catalogue lists the seeded games with a total", async ({ page }) => {
    await expect(gamesCount(page)).toBeVisible();
    expect(await readCount(page)).toBeGreaterThan(0);
    expect(await productLinks(page).count()).toBeGreaterThan(0);
  });

  test("filtering by category narrows the results and the grid changes", async ({ page }) => {
    const totalBefore = await readCount(page);
    const hrefsBefore = await renderedProductHrefs(page);

    await page.getByLabel("Strategy", { exact: true }).check();

    // Waiting on the count to change rather than on a network response: the
    // assertion that matters is that the rendered result set changed, and a
    // request that returned the same data would not be a passing filter.
    await expect
      .poll(() => readCount(page), {
        message: "The total never changed, so the category filter did not reach the API",
      })
      .toBeLessThan(totalBefore);

    // The applied filter is visible to the user, not just in the URL.
    await expect(page.getByRole("button", { name: "Remove Strategy filter" })).toBeVisible();

    await expect(productLinks(page).first()).toBeVisible();

    // Not "the first card changed": the seed's newest game happens to be a
    // Strategy title, so it is legitimately first both before and after, and
    // asserting on that failed while the filter worked correctly. What the
    // filter must do is drop the games that no longer match.
    const hrefsAfter = await renderedProductHrefs(page);
    const dropped = hrefsBefore.filter((href) => !hrefsAfter.includes(href));

    expect(
      dropped.length,
      "No product left the grid, so it did not re-render against the filtered results",
    ).toBeGreaterThan(0);
  });

  test("filtering by player count narrows the results further", async ({ page }) => {
    await page.getByLabel("Strategy", { exact: true }).check();
    await expect(page.getByRole("button", { name: "Remove Strategy filter" })).toBeVisible();

    const totalWithCategory = await readCount(page);

    // Eight players excludes most of the catalogue, which makes the
    // narrowing unambiguous rather than depending on the seed's distribution.
    await page.getByLabel("Player count").selectOption("8");

    await expect
      .poll(() => readCount(page), {
        message: "The total never changed, so the player-count filter did not reach the API",
      })
      .toBeLessThan(totalWithCategory);

    await expect(page.getByRole("button", { name: "Remove 8 players filter" })).toBeVisible();
  });

  test("clearing the filters restores the full catalogue", async ({ page }) => {
    const totalBefore = await readCount(page);

    await page.getByLabel("Strategy", { exact: true }).check();
    await expect.poll(() => readCount(page)).toBeLessThan(totalBefore);

    await page.getByRole("button", { name: "Clear All" }).click();

    await expect.poll(() => readCount(page)).toBe(totalBefore);
    await expect(page.getByText("No filters applied")).toBeVisible();
  });
});
