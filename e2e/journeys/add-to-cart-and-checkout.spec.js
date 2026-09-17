import { test, expect } from "@playwright/test";
import { signIn, readSharedCustomer } from "../support/app.js";

/**
 * Journey 3 — add to cart and check out (#150).
 *
 * Signs in once through the form, then navigates by clicking, which is both
 * what a real user does and what keeps the session alive: a full page load
 * remounts AuthContext and re-runs the refresh race in #176.
 */

/** "R 649,99" -> 649.99. The client formats ZAR with en-ZA, so the decimal
 * separator is a comma and the thousands separator a non-breaking space. */
function currencyToNumber(text) {
  const digits = text.replace(/[^\d,]/g, "").replace(",", ".");
  return Number(digits);
}

async function subtotal(page) {
  const value = page.getByText("Subtotal").locator("xpath=following-sibling::span[1]");
  await expect(value).toBeVisible();
  return currencyToNumber(await value.textContent());
}

test.describe("journey 3: add to cart and check out", () => {
  test("a signed-in customer adds a game and reaches a correct checkout summary", async ({ page }) => {
    const customer = readSharedCustomer();

    let productTitle;
    let unitPrice;
    let subtotalBefore = 0;

    await test.step("sign in", async () => {
      await signIn(page, customer.email, customer.password);
    });

    await test.step("note the cart's starting subtotal", async () => {
      await page.getByRole("link", { name: "Cart" }).click();
      await expect(page.getByRole("heading", { name: "Your cart", exact: true }).or(page.getByText("Your cart is empty.")).first()).toBeVisible();

      // The account is shared across the run and nothing empties the cart, so
      // the assertion later is on the change rather than on an absolute total.
      // That is the stronger assertion anyway: it holds whatever is already in
      // there.
      if (await page.getByRole("heading", { name: "Your cart", exact: true }).isVisible()) {
        subtotalBefore = await subtotal(page);
      }
    });

    await test.step("open a game from the catalogue", async () => {
      await page.getByRole("link", { name: "Catalogue" }).click();

      const firstCard = page.locator("a[href*='/products/']").first();
      await expect(firstCard).toBeVisible();
      await firstCard.click();

      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();
      productTitle = (await heading.textContent()).trim();

      unitPrice = currencyToNumber(
        await page.locator("p").filter({ hasText: /^R\s/ }).first().textContent(),
      );
      expect(unitPrice).toBeGreaterThan(0);
    });

    await test.step("add two of it to the cart", async () => {
      // Visible only to a signed-in user — a guest gets a "Log in to add to
      // cart" link instead, so this doubles as proof the session is live.
      const addToCart = page.getByRole("button", { name: "Add to cart" });
      await expect(addToCart).toBeVisible();

      await page.getByRole("button", { name: "Increase quantity" }).click();
      await addToCart.click();

      // The button reports the outcome itself, which is a more precise signal
      // than waiting for a navigation that does not happen.
      await expect(page.getByRole("button", { name: "Added" })).toBeVisible();
    });

    await test.step("the cart holds it and the subtotal reflects the price", async () => {
      await page.getByRole("link", { name: "Cart" }).click();

      await expect(page.getByRole("heading", { name: "Your cart", exact: true })).toBeVisible();
      await expect(page.getByText(productTitle, { exact: false }).first()).toBeVisible();

      // Asserting the arithmetic, not just that a row appeared: this is what
      // catches a cart that stores the item but prices it wrong.
      expect(await subtotal(page)).toBeCloseTo(subtotalBefore + unitPrice * 2, 2);
    });

    await test.step("checkout restates the same order", async () => {
      await page.getByRole("link", { name: "Proceed to checkout" }).click();

      await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Delivery address" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();

      // The summary is the cart re-fetched from the API after a route change,
      // not client state carried across, so this proves the two screens agree.
      await expect(page.getByText(`${productTitle} × 2`)).toBeVisible();
      expect(await subtotal(page)).toBeCloseTo(subtotalBefore + unitPrice * 2, 2);
    });

    await test.step("the delivery address form accepts input", async () => {
      await page.getByPlaceholder("Address line 1").fill("12 Test Street");
      await page.getByPlaceholder("City").fill("Pretoria");
      await page.getByPlaceholder("Province").fill("Gauteng");
      await page.getByPlaceholder("Postal code").fill("0181");

            await expect(page.getByPlaceholder("Address line 1")).toHaveValue("12 Test Street");
    });
  });

  // #175 is closed: the button places a real order and lands on the
  // confirmation screen, so this is a real assertion now, not a fixme.
  test("completing checkout places the order and lands on the confirmation", async ({ page }) => {
    const customer = readSharedCustomer();

    await signIn(page, customer.email, customer.password);

    await page.getByRole("link", { name: "Cart" }).click();
    await page.getByRole("link", { name: "Proceed to checkout" }).click();

    await page.getByPlaceholder("Address line 1").fill("12 Test Street");
    await page.getByPlaceholder("City").fill("Pretoria");
    await page.getByPlaceholder("Province").fill("Gauteng");
    await page.getByPlaceholder("Postal code").fill("0181");

    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
    expect(page.url()).toMatch(/orders\/\d+\/confirmation/);
  });
});
