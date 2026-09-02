import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getProductById(id) {
  return prisma.product.findUnique({
    where: { id },
  });
}