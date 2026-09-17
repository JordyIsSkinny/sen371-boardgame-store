import { prisma } from '../lib/prismaClient.js';

export async function getTotalReviewCount() {
  return prisma.review.count();
}

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

// #163: averageRating/reviewCount on Product are denormalised for cheap
// reads on the catalogue (see the schema comment for why), recomputed here
// on every write instead. Always called inside the same transaction as the
// review write it follows, so the two can never drift out of sync - if the
// recompute fails, the review write rolls back with it.
async function recomputeProductRating(tx, productId) {
  const aggregate = await tx.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      // Null, not zero, when the last review is deleted - "not yet rated"
      // is a different thing from "rated zero stars".
      averageRating: aggregate._count > 0 ? aggregate._avg.rating : null,
      reviewCount: aggregate._count,
    },
  });
}

export async function createReview({
  userId,
  productId,
  rating,
  comment,
}) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        userId,
        productId,
        rating,
        comment,
      },
    });

    await recomputeProductRating(tx, productId);

    return review;
  });
}

export async function updateReview(id, userId, data) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.update({
      where: {
        id,
        userId,
      },
      data,
    });

    await recomputeProductRating(tx, review.productId);

    return review;
  });
}
export async function updateReviewAsAdmin(id, data) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.update({
      where: {
        id,
      },
      data,
    });

    await recomputeProductRating(tx, review.productId);

    return review;
  });
}
export async function deleteReview(id, userId) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.delete({
      where: {
        id,
        userId,
      },
    });

    await recomputeProductRating(tx, review.productId);

    return review;
  });
}
export async function deleteReviewAsAdmin(id) {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.delete({
      where: {
        id,
      },
    });

    await recomputeProductRating(tx, review.productId);

    return review;
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