import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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