import { prisma } from '../lib/prismaClient.js';
import ValidationError from '../errors/validation-error.js';

export async function getInventoryByProductId(productId) {
  return prisma.inventory.findUnique({
    where: { productId },
  });
}

export async function updateInventory(productId, data) {
  const allowedFields = ['quantityOnHand', 'reorderThreshold'];
  const safeData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) safeData[key] = data[key];
  }

  if (safeData.quantityOnHand !== undefined && safeData.quantityOnHand < 0) {
    throw new ValidationError('quantityOnHand cannot be negative');
  }
  if (safeData.reorderThreshold !== undefined && safeData.reorderThreshold < 0) {
    throw new ValidationError('reorderThreshold cannot be negative');
  }

  return prisma.inventory.update({
    where: { productId },
    data: safeData,
  });
}