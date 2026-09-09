import * as inventoryService from "../services/inventory.service.js";

export async function getInventory(req, res, next) {
  try {
    const inventory = await inventoryService.getInventory(Number(req.params.productId));
    res.json({ data: inventory });
  } catch (err) {
    next(err);
  }
}

export async function updateInventory(req, res, next) {
  try {
    const inventory = await inventoryService.updateInventory(
      Number(req.params.productId),
      req.body,
    );
    res.json({ data: inventory });
  } catch (err) {
    next(err);
  }
}
