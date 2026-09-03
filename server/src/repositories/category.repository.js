import { prisma } from '../lib/prismaClient.js';

export async function getAllCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
}