import { prisma } from '../lib/prismaClient.js';

export async function getProductById(id) {
  return prisma.product.findUnique({
    where: { id },
  });
}

export async function getAllProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProduct(data) {
  return prisma.product.create({ data });
}

export async function updateProduct(id, data) {
  return prisma.product.update({
    where: { id },
    data,
  });
}

export async function deleteProduct(id) {
  return prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function filterProducts({
  playerCount,
  categoryId,
  maxPlayTime,
  sortBy = 'createdAt',
  sortDir = 'desc',
  page = 1,
  pageSize = 20,
} = {}) {
  const where = { isActive: true };

  if (playerCount !== undefined) {
    where.minPlayers = { lte: Number(playerCount) };
    where.maxPlayers = { gte: Number(playerCount) };
  }

  if (maxPlayTime !== undefined) {
    where.playTimeMinutes = { lte: Number(maxPlayTime) };
  }

  if (categoryId !== undefined) {
    where.categories = {
      some: { categoryId: Number(categoryId) },
    };
  }

  const allowedSortFields = ['price', 'createdAt', 'title', 'complexityRating'];
  const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderByDir = sortDir === 'asc' ? 'asc' : 'desc';

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  };
}