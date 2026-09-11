import { prisma } from '../lib/prismaClient.js';

export async function createAddress(data) {
  return prisma.address.create({ data });
}

export async function getAddressesByUser(userId) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: { id: 'desc' },
  });
}
