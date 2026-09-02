import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  getProductById,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from './product.repository.js';

const prisma = new PrismaClient();
let testProduct;
const createdIds = [];

beforeAll(async () => {
  testProduct = await prisma.product.create({
    data: {
      title: 'Wingspan',
      slug: `wingspan-test-${Date.now()}`,
      minPlayers: 1,
      maxPlayers: 5,
      playTimeMinutes: 70,
      minAge: 10,
      complexityRating: 2.4,
      price: 899.99,
    },
  });
  createdIds.push(testProduct.id);
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: { in: createdIds } } });
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

describe('getAllProducts', () => {
  it('returns a list including the seeded test product', async () => {
    const results = await getAllProducts();
    expect(Array.isArray(results)).toBe(true);
    expect(results.some((p) => p.id === testProduct.id)).toBe(true);
  });
});

describe('createProduct', () => {
  it('creates a new product', async () => {
    const created = await createProduct({
      title: 'Azul',
      slug: `azul-test-${Date.now()}`,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 45,
      minAge: 8,
      complexityRating: 1.8,
      price: 550.0,
    });
    createdIds.push(created.id);

    expect(created).not.toBeNull();
    expect(created.title).toBe('Azul');
  });
});

describe('updateProduct', () => {
  it('updates an existing product', async () => {
    const updated = await updateProduct(testProduct.id, { price: 999.99 });
    expect(Number(updated.price)).toBe(999.99);
  });
});

describe('deleteProduct', () => {
  it('soft-deletes a product by setting isActive to false', async () => {
    const created = await prisma.product.create({
      data: {
        title: 'To Delete',
        slug: `delete-test-${Date.now()}`,
        minPlayers: 1,
        maxPlayers: 2,
        playTimeMinutes: 30,
        minAge: 6,
        complexityRating: 1.0,
        price: 100.0,
      },
    });
    createdIds.push(created.id);

    const deleted = await deleteProduct(created.id);
    expect(deleted.isActive).toBe(false);
  });
});