import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prismaClient.js';
import {
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
      status: 'paid',
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
});

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
  it('returns true when the user has a paid order containing the product', async () => {
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

describe('getReviewsByProduct', () => {
  it('returns reviews belonging to the product', async () => {
    const reviews = await getReviewsByProduct(testProduct.id);

    expect(Array.isArray(reviews)).toBe(true);
    expect(reviews.some((review) => review.id === testReview.id)).toBe(true);
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