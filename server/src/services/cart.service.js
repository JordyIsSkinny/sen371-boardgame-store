import * as cartRepository from "../repositories/cart.repository.js";
import { prisma } from "../lib/prismaClient.js";

// Service layer: business rules live here, not in the controller and not
// in the repository. The controller shouldn't know quantity has to be a
// positive integer, and the repository shouldn't know what "add to cart"
// means as a business action, it just executes queries.

export async function getCart(userId) {
  const items = await cartRepository.findCartItemsByUserId(userId);
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  return { items, subtotal };
}

export async function addItem(userId, { productId, quantity }) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw { status: 422, code: "INVALID_QUANTITY", message: "Quantity must be a positive integer." };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) {
    throw { status: 404, code: "PRODUCT_NOT_FOUND", message: "Product does not exist." };
  }

  const existing = await cartRepository.findCartItemByUserAndProduct(userId, productId);
  if (existing) {
    // Adding an already-present product increases quantity rather than
    // erroring or creating a duplicate row; matches the UNIQUE(user_id,
    // product_id) constraint on cart_items from C's schema.
    return cartRepository.updateCartItemQuantity(existing.id, existing.quantity + quantity);
  }

  return cartRepository.createCartItem({ userId, productId, quantity });
}

export async function updateItemQuantity(userId, itemId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw { status: 422, code: "INVALID_QUANTITY", message: "Quantity must be a positive integer." };
  }

  const item = await cartRepository.findCartItemById(itemId);
  assertOwnership(item, userId);

  return cartRepository.updateCartItemQuantity(itemId, quantity);
}

export async function removeItem(userId, itemId) {
  const item = await cartRepository.findCartItemById(itemId);
  assertOwnership(item, userId);

  await cartRepository.deleteCartItem(itemId);
}

function assertOwnership(item, userId) {
  if (!item) {
    throw { status: 404, code: "CART_ITEM_NOT_FOUND", message: "Cart item does not exist." };
  }
  if (item.userId !== userId) {
    // Deliberately the same 404 a nonexistent item would return, rather
    // than 403, so this endpoint doesn't confirm to an attacker that a
    // given cart item id belongs to someone else.
    throw { status: 404, code: "CART_ITEM_NOT_FOUND", message: "Cart item does not exist." };
  }
}
