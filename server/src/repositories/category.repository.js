import { prisma } from '../lib/prismaClient.js';

export async function getAllCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(data) {
  return prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
    },
  });
}