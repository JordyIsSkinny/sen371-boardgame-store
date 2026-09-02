import { prisma } from "../lib/prismaClient.js";

// Repository pattern, justified in Milestone 1: this is the only file in
// the cart slice that imports prismaClient. Services never touch Prisma
// directly, they call these functions. If C's schema changes a column
// name, this is the one file that needs to change, not every service that
// happens to touch carts.
//
// Per C's schema (Milestone 1, Section 5): no separate Cart header table.
// One active cart per user is implicit, keyed directly off CartItem.userId.

export function findCartItemsByUserId(userId) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { addedAt: "asc" },
  });
}

export function findCartItemById(id) {
  return prisma.cartItem.findUnique({
    where: { id },
    include: { product: true },
  });
}

export function findCartItemByUserAndProduct(userId, productId) {
  return prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
}

export function createCartItem({ userId, productId, quantity }) {
  return prisma.cartItem.create({
    data: { userId, productId, quantity },
    include: { product: true },
  });
}

export function updateCartItemQuantity(id, quantity) {
  return prisma.cartItem.update({
    where: { id },
    data: { quantity },
    include: { product: true },
  });
}

export function deleteCartItem(id) {
  return prisma.cartItem.delete({ where: { id } });
}
