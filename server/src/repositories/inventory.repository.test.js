import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prismaClient.js';
import { getInventoryByProductId, updateInventory } from './inventory.repository.js';

let testProduct;

beforeAll(async () => {
  testProduct = await prisma.product.create({
    data: {
      title: 'Inventory Test Game',
      slug: `inventory-test-${Date.now()}`,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 45,
      minAge: 8,
      complexityRating: 2.0,
      price: 500,
      inventory: { create: { quantityOnHand: 20, reorderThreshold: 5 } },
    },
  });
});

afterAll(async () => {
  await prisma.inventory.deleteMany({ where: { productId: testProduct.id } });
  await prisma.product.delete({ where: { id: testProduct.id } });
  await prisma.$disconnect();
});

describe('getInventoryByProductId', () => {
  it('returns inventory for the product', async () => {
    const result = await getInventoryByProductId(testProduct.id);
    expect(result).not.toBeNull();
    expect(result.quantityOnHand).toBe(20);
  });

  it('returns null when no inventory exists for the product', async () => {
    const result = await getInventoryByProductId(999999);
    expect(result).toBeNull();
  });
});

describe('updateInventory', () => {
  it('updates quantityOnHand', async () => {
    const updated = await updateInventory(testProduct.id, { quantityOnHand: 15 });
    expect(updated.quantityOnHand).toBe(15);
  });

  it('updates reorderThreshold', async () => {
    const updated = await updateInventory(testProduct.id, { reorderThreshold: 10 });
    expect(updated.reorderThreshold).toBe(10);
  });

  it('rejects a negative quantityOnHand', async () => {
    await expect(updateInventory(testProduct.id, { quantityOnHand: -5 })).rejects.toThrow();
  });
});
