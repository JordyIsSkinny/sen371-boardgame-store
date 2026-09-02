import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../config/prismaClient.js';
import { filterProducts } from './product.repository.js';

const productIds = [];
let category;

beforeAll(async () => {
  category = await prisma.category.create({
    data: { name: `Strategy Filter Test ${Date.now()}`, slug: `strategy-filter-${Date.now()}` },
  });

  const productA = await prisma.product.create({
    data: {
      title: 'Small Fast Game',
      slug: `small-fast-${Date.now()}`,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 30,
      minAge: 8,
      complexityRating: 1.5,
      price: 300,
      categories: { create: { categoryId: category.id } },
    },
  });
  productIds.push(productA.id);

  const productB = await prisma.product.create({
    data: {
      title: 'Big Long Game',
      slug: `big-long-${Date.now()}`,
      minPlayers: 5,
      maxPlayers: 8,
      playTimeMinutes: 120,
      minAge: 12,
      complexityRating: 4.2,
      price: 900,
    },
  });
  productIds.push(productB.id);
}, 15000);

afterAll(async () => {
  await prisma.productCategory.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.$disconnect();
});

describe('filterProducts', () => {
  it('filters by player count within min/max range', async () => {
    const result = await filterProducts({ playerCount: 3 });
    const titles = result.items.map((p) => p.title);
    expect(titles).toContain('Small Fast Game');
    expect(titles).not.toContain('Big Long Game');
  });

  it('filters by category', async () => {
    const result = await filterProducts({ categoryId: category.id });
    const titles = result.items.map((p) => p.title);
    expect(titles).toContain('Small Fast Game');
    expect(titles).not.toContain('Big Long Game');
  });

  it('filters by max playtime', async () => {
    const result = await filterProducts({ maxPlayTime: 60 });
    const titles = result.items.map((p) => p.title);
    expect(titles).toContain('Small Fast Game');
    expect(titles).not.toContain('Big Long Game');
  });

  it('sorts by price descending', async () => {
    const result = await filterProducts({ sortBy: 'price', sortDir: 'desc' });
    const ourItems = result.items.filter((p) => productIds.includes(p.id));
    expect(ourItems[0].title).toBe('Big Long Game');
  });

  it('paginates results', async () => {
    const result = await filterProducts({ page: 1, pageSize: 1 });
    expect(result.items.length).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(typeof result.total).toBe('number');
  });
});