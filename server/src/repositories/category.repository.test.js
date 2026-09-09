import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prismaClient.js';
import { getAllCategories, createCategory } from './category.repository.js';

let testCategory;
const createdIds = [];

beforeAll(async () => {
  testCategory = await prisma.category.create({
    data: { name: 'Strategy Test', slug: 'strategy-test' },
  });
  createdIds.push(testCategory.id);
});

afterAll(async () => {
  await prisma.category.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

describe('getAllCategories', () => {
  it('returns a list including the seeded test category', async () => {
    const results = await getAllCategories();
    expect(Array.isArray(results)).toBe(true);
    expect(results.some((c) => c.id === testCategory.id)).toBe(true);
  });
});

describe('createCategory', () => {
  it('creates a new category', async () => {
    const created = await createCategory({
      name: `Party Games Test ${Date.now()}`,
      slug: `party-games-test-${Date.now()}`,
    });
    createdIds.push(created.id);

    expect(created).not.toBeNull();
    expect(created.name).toContain('Party Games Test');
  });

  it('throws when the name already exists', async () => {
    await expect(
      createCategory({ name: testCategory.name, slug: `duplicate-slug-${Date.now()}` })
    ).rejects.toThrow();
  });
});