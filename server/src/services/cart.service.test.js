import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/cart.repository.js", () => ({
  findCartItemsByUserId: vi.fn(),
  findCartItemById: vi.fn(),
  findCartItemByUserAndProduct: vi.fn(),
  createCartItem: vi.fn(),
  updateCartItemQuantity: vi.fn(),
  deleteCartItem: vi.fn(),
}));

vi.mock("../repositories/product.repository.js", () => ({
  getProductById: vi.fn(),
}));

const cartRepository = await import("../repositories/cart.repository.js");
const productRepository = await import("../repositories/product.repository.js");
const cartService = await import("./cart.service.js");

const mockProduct = { id: 1, title: "Wingspan", slug: "wingspan", price: "45.00", isActive: true };

describe("cart.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCart", () => {
    it("shapes items and computes a numeric subtotal", async () => {
      cartRepository.findCartItemsByUserId.mockResolvedValue([
        { id: 1, productId: 1, quantity: 2, addedAt: new Date(), product: mockProduct },
      ]);

      const cart = await cartService.getCart(1);

      expect(cart.subtotal).toBe(90);
      expect(cart.items[0].product.price).toBe(45);
      expect(cart.items[0].lineTotal).toBe(90);
    });
  });

  describe("addItem", () => {
    it("rejects a non-positive quantity", async () => {
      await expect(cartService.addItem(1, { productId: 1, quantity: 0 })).rejects.toMatchObject({
        status: 422,
        error: "VALIDATION_ERROR",
      });
    });

    it("rejects a product that does not exist", async () => {
      productRepository.getProductById.mockResolvedValue(null);

      await expect(
        cartService.addItem(1, { productId: 999, quantity: 1 }),
      ).rejects.toMatchObject({ status: 404, error: "NOT_FOUND" });
    });

    it("increases quantity instead of duplicating when the item already exists", async () => {
      productRepository.getProductById.mockResolvedValue(mockProduct);
      cartRepository.findCartItemByUserAndProduct.mockResolvedValue({ id: 10, quantity: 2 });
      cartRepository.updateCartItemQuantity.mockResolvedValue({
        id: 10,
        productId: 1,
        quantity: 5,
        addedAt: new Date(),
        product: mockProduct,
      });

      await cartService.addItem(1, { productId: 1, quantity: 3 });

      expect(cartRepository.updateCartItemQuantity).toHaveBeenCalledWith(10, 5);
      expect(cartRepository.createCartItem).not.toHaveBeenCalled();
    });

    it("creates a new cart item when none exists yet", async () => {
      productRepository.getProductById.mockResolvedValue(mockProduct);
      cartRepository.findCartItemByUserAndProduct.mockResolvedValue(null);
      cartRepository.createCartItem.mockResolvedValue({
        id: 11,
        productId: 1,
        quantity: 2,
        addedAt: new Date(),
        product: mockProduct,
      });

      await cartService.addItem(1, { productId: 1, quantity: 2 });

      expect(cartRepository.createCartItem).toHaveBeenCalledWith({
        userId: 1,
        productId: 1,
        quantity: 2,
      });
    });
  });

  describe("removeItem", () => {
    it("returns NotFoundError (not Forbidden) when the item belongs to someone else", async () => {
      cartRepository.findCartItemById.mockResolvedValue({ id: 5, userId: 2 });

      await expect(cartService.removeItem(1, 5)).rejects.toMatchObject({
        status: 404,
        error: "NOT_FOUND",
      });
    });
  });
});
