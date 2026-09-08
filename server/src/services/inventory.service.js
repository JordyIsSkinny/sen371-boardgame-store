import * as inventoryRepository from "../repositories/inventory.repository.js";
import NotFoundError from "../errors/not-found-error.js";
import ValidationError from "../errors/validation-error.js";

export async function getInventory(productId) {
  const inventory = await inventoryRepository.getInventoryByProductId(productId);
  if (!inventory) {
    throw new NotFoundError("Inventory not found for this product.");
  }
  return inventory;
}

export async function updateInventory(productId, data) {
  try {
    return await inventoryRepository.updateInventory(productId, data);
  } catch (err) {
    // validate.js's updateInventorySchema already rejects negative values
    // before this runs; the repository's own guard is a backstop, not the
    // primary line of defense. Translate it so the controller never sees a
    // raw Error (errorHandler only recognises AppError subclasses).
    if (err.message.includes("cannot be negative")) {
      throw new ValidationError(err.message);
    }
    throw err;
  }
}
