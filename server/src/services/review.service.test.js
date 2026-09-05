import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prismaClient.js';

import {
  listProductReviews,
  submitReview,
  editReview,
  removeReview,
} from './review.service.js';

import ValidationError from '../errors/validation-error.js';
import NotFoundError from '../errors/not-found-error.js';
import ForbiddenError from '../errors/forbidden-error.js';

let customerRole;
let testUser;
let otherUser;
let testAddress;
let testProduct;
let purchasedOrder;
let testReview;

beforeAll(async () => {
  customerRole = await prisma.role.findFirst({
    where: { name: 'customer' },
  });

  if (!customerRole) {
    throw new Error('Customer role not found.');
  }

  testUser = await prisma.user.create({
    data: {
      roleId: customerRole.id,
      email: `review-service-${Date.now()}@test.com`,
      passwordHash: 'test-password-hash',
      firstName: 'Review',
      lastName: 'Tester',
    },
  });

  otherUser = await prisma.user.create({
    data: {
      roleId: customerRole.id,
      email: `review-service-other-${Date.now()}@test.com`,
      passwordHash: 'test-password-hash',
      firstName: 'Other',
      lastName: 'Tester',
    },
  });

  testAddress = await prisma.address.create({
    data: {
      userId: testUser.id,
      line1: '123 Test Street',
      city: 'Pretoria',
      provinceState: 'Gauteng',
      postalCode: '0001',
      country: 'South Africa',
    },
  });

  testProduct = await prisma.product.create({
    data: {
      title: 'Review Service Test Game',
      slug: `review-service-test-game-${Date.now()}`,
      description: 'Product used for review service tests.',
      price: 500.0,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 60,
      minAge: 8,
      complexityRating: 3,
      isActive: true,
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
          transactionRef: `SERVICE-TEST-${Date.now()}`,
          paidAt: new Date(),
        },
      },
    },
  });

  testReview = await prisma.review.create({
    data: {
      userId: testUser.id,
      productId: testProduct.id,
      rating: 4,
      comment: 'Initial service test review.',
    },
  });
});

afterAll(async () => {
  if (testReview) {
    await prisma.review.deleteMany({
      where: {
        productId: testProduct.id,
      },
    });
  }

  if (purchasedOrder) {
    await prisma.payment.deleteMany({
      where: {
        orderId: purchasedOrder.id,
      },
    });

    await prisma.orderItem.deleteMany({
      where: {
        orderId: purchasedOrder.id,
      },
    });

    await prisma.order.delete({
      where: {
        id: purchasedOrder.id,
      },
    });
  }

  if (testProduct) {
    await prisma.inventory.deleteMany({
      where: {
        productId: testProduct.id,
      },
    });

    await prisma.product.delete({
      where: {
        id: testProduct.id,
      },
    });
  }

  if (testAddress) {
    await prisma.address.delete({
      where: {
        id: testAddress.id,
      },
    });
  }

  if (testUser) {
    await prisma.user.delete({
      where: {
        id: testUser.id,
      },
    });
  }

  if (otherUser) {
    await prisma.user.delete({
      where: {
        id: otherUser.id,
      },
    });
  }
});

describe('listProductReviews', () => {
  it('returns reviews for an existing product', async () => {
    const reviews = await listProductReviews(testProduct.id);

    expect(reviews).toHaveLength(1);
    expect(reviews[0].id).toBe(testReview.id);
    expect(reviews[0].productId).toBe(testProduct.id);
  });

  it('throws NotFoundError for a nonexistent product', async () => {
    await expect(
      listProductReviews(999999)
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('submitReview', () => {
  it(
    'creates a review for a purchased product',
    async () => {
      const newProduct = await prisma.product.create({
        data: {
          title: 'Second Review Test Game',
          slug: `second-review-test-game-${Date.now()}`,
          description: 'Product used for submit review tests.',
          price: 300.0,
          minPlayers: 2,
          maxPlayers: 4,
          playTimeMinutes: 45,
          minAge: 10,
          complexityRating: 2,
          isActive: true,
        },
      });

      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          addressId: testAddress.id,
          status: 'delivered',
          subtotal: 300.0,
          total: 300.0,
          items: {
            create: {
              productId: newProduct.id,
              productTitle: newProduct.title,
              quantity: 1,
              unitPrice: 300.0,
            },
          },
          payment: {
            create: {
              method: 'card',
              status: 'completed',
              transactionRef: `SUBMIT-TEST-${Date.now()}`,
              paidAt: new Date(),
            },
          },
        },
      });

      const review = await submitReview(
        testUser.id,
        newProduct.id,
        5,
        'Excellent game!'
      );

      expect(review.productId).toBe(newProduct.id);
      expect(review.userId).toBe(testUser.id);
      expect(review.rating).toBe(5);
      expect(review.comment).toBe('Excellent game!');

      await prisma.review.delete({
        where: { id: review.id },
      });

      await prisma.payment.delete({
        where: { orderId: order.id },
      });

      await prisma.orderItem.deleteMany({
        where: { orderId: order.id },
      });

      await prisma.order.delete({
        where: { id: order.id },
      });

      await prisma.product.delete({
        where: { id: newProduct.id },
      });
    },
    10000
  );

  it('throws NotFoundError when the product does not exist', async () => {
    await expect(
      submitReview(testUser.id, 999999, 5, 'Great game!')
    ).rejects.toBeInstanceOf(NotFoundError);
  });


  it('throws NotFoundError when the product does not exist', async () => {
    await expect(
      submitReview(testUser.id, 999999, 5, 'Great game!')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ValidationError when the rating is below 1', async () => {
    await expect(
      submitReview(testUser.id, testProduct.id, 0, 'Bad rating')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when the rating is above 5', async () => {
    await expect(
      submitReview(testUser.id, testProduct.id, 6, 'Bad rating')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when the rating is not an integer', async () => {
    await expect(
      submitReview(testUser.id, testProduct.id, 4.5, 'Invalid rating')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ForbiddenError when the user has not purchased the product', async () => {
    await expect(
      submitReview(
        otherUser.id,
        testProduct.id,
        5,
        'I want to review this'
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('editReview', () => {
  it('allows a user to update their own review', async () => {
    const updatedReview = await editReview(
      testReview.id,
      testUser.id,
      'customer',
      {
        rating: 5,
        comment: 'Updated review.',
      }
    );

    expect(updatedReview.id).toBe(testReview.id);
    expect(updatedReview.userId).toBe(testUser.id);
    expect(updatedReview.productId).toBe(testProduct.id);
    expect(updatedReview.rating).toBe(5);
    expect(updatedReview.comment).toBe('Updated review.');
  });

  it('throws NotFoundError when the review does not exist', async () => {
    await expect(
      editReview(
        999999,
        testUser.id,
        'customer',
        {
          rating: 5,
          comment: 'Updated review.',
        }
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ForbiddenError when another user tries to update the review', async () => {
    await expect(
      editReview(
        testReview.id,
        otherUser.id,
        'customer',
        {
          rating: 5,
          comment: 'I should not be able to change this.',
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws ValidationError when the updated rating is invalid', async () => {
    await expect(
      editReview(
        testReview.id,
        testUser.id,
        'customer',
        {
          rating: 6,
          comment: 'Invalid rating.',
        }
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows an admin to update another user’s review', async () => {
    const updatedReview = await editReview(
      testReview.id,
      otherUser.id,
      'admin',
      {
        rating: 3,
        comment: 'Updated by admin.',
      }
    );

    expect(updatedReview.id).toBe(testReview.id);
    expect(updatedReview.userId).toBe(testUser.id);
    expect(updatedReview.rating).toBe(3);
    expect(updatedReview.comment).toBe('Updated by admin.');
  });
});

describe('removeReview', () => {
  it('throws NotFoundError when the review does not exist', async () => {
    await expect(
      removeReview(999999, testUser.id, 'customer')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ForbiddenError when another user tries to delete the review', async () => {
    await expect(
      removeReview(
        testReview.id,
        otherUser.id,
        'customer'
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('allows an admin to delete another user’s review', async () => {
    const adminReview = await prisma.review.create({
      data: {
        userId: otherUser.id,
        productId: testProduct.id,
        rating: 4,
        comment: 'Review for admin deletion test.',
      },
    });

    await removeReview(
      adminReview.id,
      otherUser.id,
      'admin'
    );

    const deletedReview = await prisma.review.findUnique({
      where: {
        id: adminReview.id,
      },
    });

    expect(deletedReview).toBeNull();
  });

  it('allows a user to delete their own review', async () => {
    await removeReview(
      testReview.id,
      testUser.id,
      'customer'
    );

    const deletedReview = await prisma.review.findUnique({
      where: {
        id: testReview.id,
      },
    });

    expect(deletedReview).toBeNull();
  });
});