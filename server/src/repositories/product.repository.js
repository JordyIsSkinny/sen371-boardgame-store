import { prisma } from "../lib/prismaClient.js";

// PROVISIONAL, C owns the authoritative product repository (Database
// Integration), which already exists on PR #28 with getProductById plus
// filtering, sorting and pagination. This file exists only so cart.service.js
// stops importing prismaClient directly.
//
// Named getProductById to match C's real file exactly, so replacing this
// with C's version is a straight file swap.

export function getProductById(id) {
  return prisma.product.findUnique({ where: { id } });
}
