import * as cartRepository from "../repositories/cart.repository.js";
import * as productRepository from "../repositories/product.repository.js";
import { toCartView, toCartItemView } from "../models/cart.model.js";
import ValidationError from "../errors/validation-error.js";
import NotFoundError from "../errors/not-found-error.js";

// Service layer: business rules live here, not in the controller and not
// in the repository. The controller shouldn't know quantity has to be a
// positive integer, and the repository shouldn't know what "add to cart"
// means as a business action, it just executes queries.
//
// Throws A's actual AppError subclasses, not plain object literals.
// A's errorHandler only catches `instanceof AppError`; anything else falls
// through to a generic 500. That's not a hypothetical, it was silently
// swallowing every 4xx this file threw until this fix.

export async function getCart(userId) {
  const items = await cartRepository.findCartItemsByUserId(userId);
  return toCartView(items);
}

export async function addItem(userId, { productId, quantity }) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError("Quantity must be a positive integer.");
  }

  const product = await productRepository.getProductById(productId);
  if (!product || !product.isActive) {
    throw new NotFoundError("Product does not exist.");
  }

  const existing = await cartRepository.findCartItemByUserAndProduct(userId, productId);
  const item = existing
    ? await cartRepository.updateCartItemQuantity(existing.id, existing.quantity + quantity)
    : await cartRepository.createCartItem({ userId, productId, quantity });

  return toCartItemView(item);
}

export async function updateItemQuantity(userId, itemId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError("Quantity must be a positive integer.");
  }

  const existing = await cartRepository.findCartItemById(itemId);
  assertOwnership(existing, userId);

  const item = await cartRepository.updateCartItemQuantity(itemId, quantity);
  return toCartItemView(item);
}

export async function removeItem(userId, itemId) {
  const item = await cartRepository.findCartItemById(itemId);
  assertOwnership(item, userId);

  await cartRepository.deleteCartItem(itemId);
}

function assertOwnership(item, userId) {
  if (!item || item.userId !== userId) {
    throw new NotFoundError("Cart item does not exist.");
  }
}
