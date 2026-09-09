import { describe, it, expect, vi, beforeEach } from "vitest";

import { getInventory, updateInventory } from "./inventory.controller.js";
import * as inventoryService from "../services/inventory.service.js";

describe("inventory.controller", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { params: {}, body: {}, user: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe("getInventory", () => {
    it("returns the inventory row for the product", async () => {
      const inventory = { productId: 1, quantityOnHand: 10 };
      req.params.productId = "1";
      vi.spyOn(inventoryService, "getInventory").mockResolvedValue(inventory);

      await getInventory(req, res, next);

      expect(inventoryService.getInventory).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ data: inventory });
      expect(next).not.toHaveBeenCalled();
    });

    it("passes service errors to next", async () => {
      const error = new Error("boom");
      req.params.productId = "1";
      vi.spyOn(inventoryService, "getInventory").mockRejectedValue(error);

      await getInventory(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateInventory", () => {
    it("updates the inventory row for the product", async () => {
      const inventory = { productId: 1, quantityOnHand: 5 };
      req.params.productId = "1";
      req.body = { quantityOnHand: 5 };
      vi.spyOn(inventoryService, "updateInventory").mockResolvedValue(inventory);

      await updateInventory(req, res, next);

      expect(inventoryService.updateInventory).toHaveBeenCalledWith(1, { quantityOnHand: 5 });
      expect(res.json).toHaveBeenCalledWith({ data: inventory });
    });

    it("passes service errors to next", async () => {
      const error = new Error("boom");
      req.params.productId = "1";
      vi.spyOn(inventoryService, "updateInventory").mockRejectedValue(error);

      await updateInventory(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
