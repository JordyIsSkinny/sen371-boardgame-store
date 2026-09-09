import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/inventory.repository.js", () => ({
  getInventoryByProductId: vi.fn(),
  updateInventory: vi.fn(),
}));

const inventoryRepository = await import("../repositories/inventory.repository.js");
const inventoryService = await import("./inventory.service.js");

const mockInventory = { productId: 1, quantityOnHand: 10, reorderThreshold: 2 };

describe("inventory.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getInventory", () => {
    it("returns the inventory row when found", async () => {
      inventoryRepository.getInventoryByProductId.mockResolvedValue(mockInventory);

      const inventory = await inventoryService.getInventory(1);

      expect(inventory).toBe(mockInventory);
    });

    it("throws NotFoundError when no inventory row exists for the product", async () => {
      inventoryRepository.getInventoryByProductId.mockResolvedValue(null);

      await expect(inventoryService.getInventory(999)).rejects.toMatchObject({
        status: 404,
        error: "NOT_FOUND",
      });
    });
  });

  describe("updateInventory", () => {
    it("delegates to the repository and returns the updated row", async () => {
      inventoryRepository.updateInventory.mockResolvedValue(mockInventory);

      const inventory = await inventoryService.updateInventory(1, { quantityOnHand: 10 });

      expect(inventory).toBe(mockInventory);
      expect(inventoryRepository.updateInventory).toHaveBeenCalledWith(1, { quantityOnHand: 10 });
    });

    it("propagates repository errors unchanged, e.g. the negative-value ValidationError", async () => {
      // The repository throws ValidationError directly as a backstop (see
      // inventory.repository.js) — nothing left for this service to
      // translate, just a pass-through call.
      const validationError = new Error("quantityOnHand cannot be negative");
      inventoryRepository.updateInventory.mockRejectedValue(validationError);

      await expect(
        inventoryService.updateInventory(1, { quantityOnHand: -1 }),
      ).rejects.toBe(validationError);
    });
  });
});
