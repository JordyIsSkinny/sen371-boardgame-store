import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getAllMechanics() {
  return prisma.mechanic.findMany({
    orderBy: { name: 'asc' },
  });
}