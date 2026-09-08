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

    it("translates the repository's negative-value guard into ValidationError", async () => {
      inventoryRepository.updateInventory.mockRejectedValue(
        new Error("quantityOnHand cannot be negative"),
      );

      await expect(
        inventoryService.updateInventory(1, { quantityOnHand: -1 }),
      ).rejects.toMatchObject({ status: 422, error: "VALIDATION_ERROR" });
    });

    it("rethrows unrelated repository errors unchanged", async () => {
      const unexpected = new Error("connection lost");
      inventoryRepository.updateInventory.mockRejectedValue(unexpected);

      await expect(inventoryService.updateInventory(1, {})).rejects.toBe(unexpected);
    });
  });
});
