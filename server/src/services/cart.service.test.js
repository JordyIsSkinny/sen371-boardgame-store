import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocked before import so cart.service.js receives the mock, not the real
// repository. This is what "controllers/services testable without a real
// database" (Milestone 1, Repository Pattern) actually looks like in code.
vi.mock("../repositories/cart.repository.js", () => ({
  findCartItemsByUserId: vi.fn(),
  findCartItemById: vi.fn(),
  findCartItemByUserAndProduct: vi.fn(),
  createCartItem: vi.fn(),
  updateCartItemQuantity: vi.fn(),
  deleteCartItem: vi.fn(),
}));

vi.mock("../lib/prismaClient.js", () => ({
  prisma: { product: { findUnique: vi.fn() } },
}));

const cartRepository = await import("../repositories/cart.repository.js");
const { prisma } = await import("../lib/prismaClient.js");
const cartService = await import("./cart.service.js");

describe("cart.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addItem", () => {
    it("rejects a non-positive quantity", async () => {
      await expect(cartService.addItem(1, { productId: 1, quantity: 0 })).rejects.toMatchObject({
        status: 422,
        code: "INVALID_QUANTITY",
      });
    });

    it("rejects a product that does not exist", async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        cartService.addItem(1, { productId: 999, quantity: 1 }),
      ).rejects.toMatchObject({ status: 404, code: "PRODUCT_NOT_FOUND" });
    });

    it("increases quantity instead of duplicating when the item already exists", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 1, isActive: true });
      cartRepository.findCartItemByUserAndProduct.mockResolvedValue({ id: 10, quantity: 2 });

      await cartService.addItem(1, { productId: 1, quantity: 3 });

      expect(cartRepository.updateCartItemQuantity).toHaveBeenCalledWith(10, 5);
      expect(cartRepository.createCartItem).not.toHaveBeenCalled();
    });

    it("creates a new cart item when none exists yet", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 1, isActive: true });
      cartRepository.findCartItemByUserAndProduct.mockResolvedValue(null);

      await cartService.addItem(1, { productId: 1, quantity: 2 });

      expect(cartRepository.createCartItem).toHaveBeenCalledWith({
        userId: 1,
        productId: 1,
        quantity: 2,
      });
    });
  });

  describe("removeItem", () => {
    it("returns 404 rather than 403 when the item belongs to someone else", async () => {
      cartRepository.findCartItemById.mockResolvedValue({ id: 5, userId: 2 });

      await expect(cartService.removeItem(1, 5)).rejects.toMatchObject({
        status: 404,
        code: "CART_ITEM_NOT_FOUND",
      });
    });
  });
});
