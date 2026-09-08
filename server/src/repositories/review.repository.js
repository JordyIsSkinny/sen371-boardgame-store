import { prisma } from '../lib/prismaClient.js';

export async function getReviewsByProduct(
  productId,
  { page = 1, pageSize = 10 } = {},
) {
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.review.count({
      where: { productId },
    }),
  ]);

  return {
    items,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
  };
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