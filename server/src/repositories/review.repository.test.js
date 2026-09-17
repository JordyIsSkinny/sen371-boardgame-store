import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prismaClient.js';
import {
  getTotalReviewCount,
  getReviewsByProduct,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  hasPurchasedProduct,
} from './review.repository.js';

let testRole;
let testUser;
let testProduct;
let testAddress;
let purchasedOrder;
let testReview;

beforeAll(async () => {
  testRole = await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: { name: 'customer' },
  });

  testUser = await prisma.user.create({
    data: {
      roleId: testRole.id,
      email: `review-test-${Date.now()}@example.com`,
      passwordHash: 'not-a-real-hash',
      firstName: 'Review',
      lastName: 'Tester',
    },
  });

   testAddress = await prisma.address.create({
    data: {
      userId: testUser.id,
            line1: '1 Review Street',
      city: 'Pretoria',
      provinceState: 'Gauteng',
      postalCode: '0001',
      country: 'South Africa',
    },
  });

  testProduct = await prisma.product.create({
    data: {
      title: 'Review Test Game',
      slug: `review-test-${Date.now()}`,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 60,
      minAge: 8,
      complexityRating: 2.0,
      price: 500.0,
      inventory: {
        create: {
          quantityOnHand: 20,
        },
      },
    },
  });

  purchasedOrder = await prisma.order.create({
    data: {
      userId: testUser.id,
      addressId: testAddress.id,
      status: 'delivered',
      subtotal: 500.0,
      total: 500.0,
      items: {
        create: {
          productId: testProduct.id,
          productTitle: testProduct.title,
          quantity: 1,
          unitPrice: 500.0,
        },
      },
      payment: {
        create: {
          method: 'card',
          status: 'completed',
          transactionRef: `TEST-${Date.now()}`,
          paidAt: new Date(),
        },
      },
    },
  });
}, 30000);

afterAll(async () => {
  if (testUser) {
    await prisma.review.deleteMany({
      where: { userId: testUser.id },
    });
  }

  if (purchasedOrder) {
    await prisma.payment.deleteMany({
      where: { orderId: purchasedOrder.id },
    });

    await prisma.orderItem.deleteMany({
      where: { orderId: purchasedOrder.id },
    });

    await prisma.order.delete({
      where: { id: purchasedOrder.id },
    });
  }

  if (testProduct) {
    await prisma.inventory.deleteMany({
      where: { productId: testProduct.id },
    });

    await prisma.product.delete({
      where: { id: testProduct.id },
    });
  }

  if (testAddress) {
    await prisma.address.delete({
      where: { id: testAddress.id },
    });
  }

  if (testUser) {
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  }

  await prisma.$disconnect();
});

describe('hasPurchasedProduct', () => {
  it('returns true when the user has a delivered order containing the product', async () => {
    const result = await hasPurchasedProduct(
      testUser.id,
      testProduct.id
    );

    expect(result).toBe(true);
  });

  it('returns false when the user has not purchased the product', async () => {
    const anotherProduct = await prisma.product.create({
      data: {
        title: 'Unpurchased Test Game',
        slug: `unpurchase-test-${Date.now()}`,
        minPlayers: 2,
        maxPlayers: 4,
        playTimeMinutes: 45,
        minAge: 8,
        complexityRating: 1.5,
        price: 300.0,
      },
    });

    try {
      const result = await hasPurchasedProduct(
        testUser.id,
        anotherProduct.id
      );

      expect(result).toBe(false);
    } finally {
      await prisma.product.delete({
        where: { id: anotherProduct.id },
      });
    }
  });
});

describe('createReview', () => {
  it('creates a review for a purchased product', async () => {
    testReview = await createReview({
      userId: testUser.id,
      productId: testProduct.id,
      rating: 5,
      comment: 'Excellent game!',
    });

    expect(testReview).not.toBeNull();
    expect(testReview.userId).toBe(testUser.id);
    expect(testReview.productId).toBe(testProduct.id);
    expect(testReview.rating).toBe(5);
    expect(testReview.comment).toBe('Excellent game!');
  });
});

// #163: isolated from testProduct on purpose - createReview/updateReview/
// deleteReview above and below all mutate testProduct's rating as a side
// effect too now, so asserting exact averages against a product other
// tests are concurrently reviewing would be order-dependent and fragile.
describe('aggregate rating recompute', () => {
  let ratingProduct;
  let otherRatingUser;
  const reviewIds = [];

  beforeAll(async () => {
    ratingProduct = await prisma.product.create({
      data: {
        title: 'Rating Aggregate Test Game',
        slug: `rating-aggregate-test-${Date.now()}`,
        minPlayers: 2,
        maxPlayers: 4,
        playTimeMinutes: 60,
        minAge: 8,
        complexityRating: 2.0,
        price: 400.0,
      },
    });

    otherRatingUser = await prisma.user.create({
      data: {
        roleId: testRole.id,
        email: `rating-aggregate-${Date.now()}@example.com`,
        passwordHash: 'not-a-real-hash',
        firstName: 'Other',
        lastName: 'Rater',
      },
    });
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { productId: ratingProduct.id } });
    await prisma.user.delete({ where: { id: otherRatingUser.id } });
    await prisma.product.delete({ where: { id: ratingProduct.id } });
  });

  it('has no rating before any review exists', async () => {
    const fresh = await prisma.product.findUnique({ where: { id: ratingProduct.id } });
    expect(fresh.averageRating).toBeNull();
    expect(fresh.reviewCount).toBe(0);
  });

  it('sets averageRating to the rating and reviewCount to 1 on the first review', async () => {
    const review = await createReview({
      userId: testUser.id,
      productId: ratingProduct.id,
      rating: 5,
      comment: 'First review.',
    });
    reviewIds.push(review.id);

    const updated = await prisma.product.findUnique({ where: { id: ratingProduct.id } });
    expect(Number(updated.averageRating)).toBe(5);
    expect(updated.reviewCount).toBe(1);
  });

  it('averages correctly across multiple reviews', async () => {
    const review = await createReview({
      userId: otherRatingUser.id,
      productId: ratingProduct.id,
      rating: 3,
      comment: 'Second review.',
    });
    reviewIds.push(review.id);

    const updated = await prisma.product.findUnique({ where: { id: ratingProduct.id } });
    expect(Number(updated.averageRating)).toBe(4);
    expect(updated.reviewCount).toBe(2);
  });

  it('recomputes when a review is updated', async () => {
    await updateReview(reviewIds[0], testUser.id, { rating: 1 });

    const updated = await prisma.product.findUnique({ where: { id: ratingProduct.id } });
    // (1 + 3) / 2 = 2
    expect(Number(updated.averageRating)).toBe(2);
    expect(updated.reviewCount).toBe(2);
  });

  it('recomputes when a review is deleted, back to null/0 once the last one is gone', async () => {
    await deleteReview(reviewIds[0], testUser.id);

    const updated = await prisma.product.findUnique({ where: { id: ratingProduct.id } });
    expect(Number(updated.averageRating)).toBe(3);
    expect(updated.reviewCount).toBe(1);

    // reviewIds[1] belongs to otherRatingUser, not testUser.
    await deleteReview(reviewIds[1], otherRatingUser.id);

    const afterLastDelete = await prisma.product.findUnique({ where: { id: ratingProduct.id } });
    expect(afterLastDelete.averageRating).toBeNull();
    expect(afterLastDelete.reviewCount).toBe(0);
  });
});

describe('getTotalReviewCount', () => {
  it('returns a count that includes the test review', async () => {
    const total = await getTotalReviewCount();

    expect(total).toBeGreaterThanOrEqual(1);
  });
});

describe('getReviewsByProduct', () => {
 it('returns reviews belonging to the product', async () => {
  const result = await getReviewsByProduct(testProduct.id);

  expect(Array.isArray(result.items)).toBe(true);
  expect(result.items.some((review) => review.id === testReview.id)).toBe(true);
  expect(result.total).toBeGreaterThanOrEqual(1);
  expect(result.page).toBe(1);
  expect(result.pageSize).toBe(10);
});
});

describe('getReviewById', () => {
  it('returns the review when it exists', async () => {
    const review = await getReviewById(testReview.id);

    expect(review).not.toBeNull();
    expect(review.id).toBe(testReview.id);
    expect(review.user.id).toBe(testUser.id);
    expect(review.product.id).toBe(testProduct.id);
  });

  it('returns null for a nonexistent review', async () => {
    const review = await getReviewById(999999);

    expect(review).toBeNull();
  });
});

describe('updateReview', () => {
  it('updates a review belonging to the user', async () => {
    const updated = await updateReview(
      testReview.id,
      testUser.id,
      {
        rating: 4,
        comment: 'Still a great game.',
      }
    );

    expect(updated.rating).toBe(4);
    expect(updated.comment).toBe('Still a great game.');
  });
});

describe('deleteReview', () => {
  it('deletes a review belonging to the user', async () => {
    const deleted = await deleteReview(
      testReview.id,
      testUser.id
    );

    expect(deleted.id).toBe(testReview.id);

    const found = await getReviewById(testReview.id);
    expect(found).toBeNull();

    testReview = null;
  });
});