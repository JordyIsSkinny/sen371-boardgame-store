import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getProductById } from './product.repository.js';

const prisma = new PrismaClient();
let testProduct;

beforeAll(async () => {
  testProduct = await prisma.product.create({
    data: {
      title: 'Wingspan',
      slug: 'wingspan-test',
      minPlayers: 1,
      maxPlayers: 5,
      playTimeMinutes: 70,
      minAge: 10,
      complexityRating: 2.4,
      price: 899.99,
    },
  });
});

afterAll(async () => {
  await prisma.product.delete({ where: { id: testProduct.id } });
  await prisma.$disconnect();
});

describe('getProductById', () => {
  it('returns the product when it exists', async () => {
    const result = await getProductById(testProduct.id);
    expect(result).not.toBeNull();
    expect(result.title).toBe('Wingspan');
  });

  it('returns null when the product does not exist', async () => {
    const result = await getProductById(999999);
    expect(result).toBeNull();
  });
});