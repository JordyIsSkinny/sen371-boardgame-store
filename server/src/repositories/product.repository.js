import { prisma } from '../lib/prismaClient.js';

export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      inventory: true,
    },
  });
  if (!product) return null;

  // Flatten the categories join table the same way filterProducts does —
  // the detail page needs a category name, not a { productId, categoryId }
  // pivot row.
  const { categories, ...rest } = product;
  return { ...rest, categories: categories.map((pc) => pc.category) };
}

export async function getAllProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

// categoryId/quantityOnHand are optional — a caller that omits both gets
// the previous plain-create behaviour. When either is present, the
// ProductCategory and/or Inventory row is created in the same transaction
// as the product itself, mirroring order.repository.js's createOrder.
// Without this, a product created via POST /products had no category (so
// it was invisible to filterProducts' categoryId filter) and no inventory
// row (so it always read as out-of-stock) until a separate admin edit
// filled both in — see #126.
export async function createProduct({ categoryId, quantityOnHand, ...productData }) {
  if (categoryId === undefined && quantityOnHand === undefined) {
    return prisma.product.create({ data: productData });
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: productData });

    if (categoryId !== undefined) {
      await tx.productCategory.create({
        data: { productId: product.id, categoryId: Number(categoryId) },
      });
    }

    if (quantityOnHand !== undefined) {
      await tx.inventory.create({
        data: { productId: product.id, quantityOnHand: Number(quantityOnHand) },
      });
    }

    return product;
  });
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

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take,
      include: {
        categories: { include: { category: true } },
        inventory: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Flatten the categories join table into plain category objects — the
  // catalogue card needs a category name, not a { productId, categoryId }
  // pivot row.
  const items = rows.map(({ categories, ...product }) => ({
    ...product,
    categories: categories.map((pc) => pc.category),
  }));

  return {
    items,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  };
}