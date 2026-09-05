import { prisma } from '../lib/prismaClient.js';

export async function getReviewsByProduct(productId) {
  return prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

export async function getReviewById(id) {
  return prisma.review.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      product: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

export async function createReview({
  userId,
  productId,
  rating,
  comment,
}) {
  return prisma.review.create({
    data: {
      userId,
      productId,
      rating,
      comment,
    },
  });
}

export async function updateReview(id, userId, data) {
  return prisma.review.update({
    where: {
      id,
      userId,
    },
    data,
  });
}
export async function updateReviewAsAdmin(id, data) {
  return prisma.review.update({
    where: {
      id,
    },
    data,
  });
}
export async function deleteReview(id, userId) {
  return prisma.review.delete({
    where: {
      id,
      userId,
    },
  });
}
export async function deleteReviewAsAdmin(id) {
  return prisma.review.delete({
    where: {
      id,
    },
  });
}

export async function hasPurchasedProduct(userId, productId) {
  const order = await prisma.order.findFirst({
    where: {
      userId,
      status: 'delivered',
      items: {
        some: {
          productId,
        },
      },
      payment: {
        is: {
          status: 'completed',
        },
      },
    },
    select: {
      id: true,
    },
  });

  return order !== null;
}