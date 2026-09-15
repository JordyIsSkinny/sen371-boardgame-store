import { test, expect } from "@playwright/test";
import { signIn } from "../support/app.js";
import {
  registerCustomer,
  getFirstInStockProduct,
  addToCart,
  createAddress,
  placeOrder,
} from "../support/api.js";

/**
 * Journey 4 — a logged-in user sees the order they just placed (#150).
 *
 * Arranges the order through the API rather than through Checkout, and that
 * is a deliberate substitution, not a shortcut around a hard step. Checkout's
 * Place order button is hardcoded disabled and nothing in the client calls
 * POST /orders (#175), so there is no UI path to place an order at all today.
 * Arranging through the API is the only way to get an order in front of S8
 * Order History to actually cover that screen, rather than leaving it
 * completely untested until #175 is fixed.
 *
 * A dedicated account, not the shared one from auth.setup.js: Order History
 * has no per-run isolation (it lists every order the account has ever
 * placed), and a fresh account is what lets this test assert on the *only*
 * order in the list rather than searching for one among leftovers from other
 * runs or other journeys.
 */
test.describe("journey 4: order history", () => {
  test("a customer sees the order they placed, with the right items and total", async ({
    page,
    request,
  }) => {
    let order;
    let productTitle;
    let arranged;

    arranged = await test.step("arrange: place an order through the API", async () => {
      const customer = await registerCustomer(request, "orderhistory");
      const product = await getFirstInStockProduct(request);
      productTitle = product.title;

      await addToCart(request, customer.accessToken, product.id, 1);
      const address = await createAddress(request, customer.accessToken);

      order = await placeOrder(request, customer.accessToken, {
        addressId: address.id,
        items: [{ productId: product.id, quantity: 1 }],
      });

      return customer;
    });

    await test.step("sign in as that customer through the UI", async () => {
      await signIn(page, arranged.email, arranged.password);
    });

    await test.step("the order appears in order history", async () => {
      await page.getByRole("link", { name: "Orders" }).click();

      await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
      await expect(page.getByRole("heading", { name: `Order #${order.id}` })).toBeVisible();

      // 1 item, since the arrangement added exactly one.
      await expect(page.getByText("1 item", { exact: true })).toBeVisible();
    });

    await test.step("the order's total matches what was placed", async () => {
      const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });
      const expectedTotal = currency.format(Number(order.total));

      const orderCard = page.locator("article", { hasText: `Order #${order.id}` });
      await expect(orderCard.getByText(expectedTotal, { exact: true })).toBeVisible();
    });

    await test.step("the status filter narrows to it", async () => {
      // A freshly placed order is "pending" — validated by updateOrderStatusSchema
      // (server/src/middleware/validate.js) and the OrderStatus enum, not
      // guessed here.
      await page.getByLabel("Filter orders by status").selectOption("pending");

      await expect(page.getByRole("heading", { name: `Order #${order.id}` })).toBeVisible();

      await page.getByLabel("Filter orders by status").selectOption("delivered");
      await expect(page.getByText("No orders match this status.")).toBeVisible();
    });
  });

  /**
   * Blocked by #175, same as journey 3's fixme. Once Checkout can place an
   * order, this is the version of the journey the issue actually names:
   * "a logged-in user sees the order they just placed" through the UI, start
   * to finish, with no API arrangement standing in for the missing step.
   */
  test.fixme("an order placed through checkout appears in order history immediately after", async ({
    page,
  }) => {
    // Deliberately not implemented: this is the assertion #175 unblocks, kept
    // here so removing the fixme is the only change it should need.
  });
});
