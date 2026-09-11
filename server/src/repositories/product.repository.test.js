import { prisma } from '../lib/prismaClient.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getProductById,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from './product.repository.js';
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

  it('returns an empty categories array and null inventory when neither exist', async () => {
    const result = await getProductById(testProduct.id);
    expect(result.categories).toEqual([]);
    expect(result.inventory).toBeNull();
  });
});

describe('getProductById with related data', () => {
  let category;
  let categorizedProduct;

  beforeAll(async () => {
    category = await prisma.category.create({
      data: { name: `Detail Test ${Date.now()}`, slug: `detail-test-${Date.now()}` },
    });
    categorizedProduct = await prisma.product.create({
      data: {
        title: 'Catan',
        slug: `catan-test-${Date.now()}`,
        minPlayers: 3,
        maxPlayers: 4,
        playTimeMinutes: 90,
        minAge: 10,
        complexityRating: 2.3,
        price: 650,
        categories: { create: { categoryId: category.id } },
        inventory: { create: { quantityOnHand: 12 } },
      },
    });
    createdIds.push(categorizedProduct.id);
  });

  afterAll(async () => {
    await prisma.productCategory.deleteMany({ where: { productId: categorizedProduct.id } });
    await prisma.inventory.deleteMany({ where: { productId: categorizedProduct.id } });
    await prisma.category.delete({ where: { id: category.id } });
  });

  it('flattens the category join table into plain category objects', async () => {
    const result = await getProductById(categorizedProduct.id);
    expect(result.categories).toEqual([
      expect.objectContaining({ id: category.id, name: category.name }),
    ]);
  });

  it('includes inventory stock data', async () => {
    const result = await getProductById(categorizedProduct.id);
    expect(result.inventory).toEqual(expect.objectContaining({ quantityOnHand: 12 }));
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

describe('createProduct with an optional category and initial stock', () => {
  let category;

  beforeAll(async () => {
    category = await prisma.category.create({
      data: { name: `Create Test ${Date.now()}`, slug: `create-test-${Date.now()}` },
    });
  });

  afterAll(async () => {
    await prisma.category.delete({ where: { id: category.id } });
  });

  it('creates the ProductCategory and Inventory rows in the same transaction', async () => {
    const created = await createProduct({
      title: 'Brass: Birmingham',
      slug: `brass-test-${Date.now()}`,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 120,
      minAge: 14,
      complexityRating: 3.9,
      price: 750.0,
      categoryId: category.id,
      quantityOnHand: 8,
    });
    createdIds.push(created.id);

    const withRelations = await getProductById(created.id);
    expect(withRelations.categories).toEqual([expect.objectContaining({ id: category.id })]);
    expect(withRelations.inventory).toEqual(expect.objectContaining({ quantityOnHand: 8 }));
  });

  it('still creates a product with no category or inventory row when neither is provided', async () => {
    const created = await createProduct({
      title: 'Plain Product',
      slug: `plain-test-${Date.now()}`,
      minPlayers: 1,
      maxPlayers: 2,
      playTimeMinutes: 20,
      minAge: 5,
      complexityRating: 1.0,
      price: 100.0,
    });
    createdIds.push(created.id);

    const withRelations = await getProductById(created.id);
    expect(withRelations.categories).toEqual([]);
    expect(withRelations.inventory).toBeNull();
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