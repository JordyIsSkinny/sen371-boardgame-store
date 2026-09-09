import * as inventoryRepository from "../repositories/inventory.repository.js";
import NotFoundError from "../errors/not-found-error.js";

export async function getInventory(productId) {
  const inventory = await inventoryRepository.getInventoryByProductId(productId);
  if (!inventory) {
    throw new NotFoundError("Inventory not found for this product.");
  }
  return inventory;
}

// validate.js's updateInventorySchema is the primary guard against negative
// values; the repository throws ValidationError directly as a backstop, so
// there's nothing left to translate here.
export async function updateInventory(productId, data) {
  return inventoryRepository.updateInventory(productId, data);
}
