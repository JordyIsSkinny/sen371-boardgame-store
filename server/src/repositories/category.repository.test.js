import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getAllCategories } from './category.repository.js';

const prisma = new PrismaClient();
let testCategory;

beforeAll(async () => {
  testCategory = await prisma.category.create({
    data: { name: 'Strategy Test', slug: 'strategy-test' },
  });
});

afterAll(async () => {
  await prisma.category.delete({ where: { id: testCategory.id } });
  await prisma.$disconnect();
});

describe('getAllCategories', () => {
  it('returns a list including the seeded test category', async () => {
    const results = await getAllCategories();
    expect(Array.isArray(results)).toBe(true);
    expect(results.some((c) => c.id === testCategory.id)).toBe(true);
  });
});