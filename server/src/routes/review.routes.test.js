import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let app;
let request;
let prisma;
let signAccessToken;

let customerRole;
let testUser;
let otherUser;
let testAddress;
let testProduct;
let purchasedOrder;
let testReview;
let accessToken;
let otherAccessToken;

beforeAll(async () => {
  process.env.DATABASE_URL ??=
    'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET ??= 'test-access-secret';
  process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret';
  process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';

  const [
    { createApp },
    prismaModule,
    tokenModule,
    supertestModule,
  ] = await Promise.all([
    import('../app.js'),
    import('../lib/prismaClient.js'),
    import('../services/token.service.js'),
    import('supertest'),
  ]);

  app = createApp();
  prisma = prismaModule.prisma;
  signAccessToken = tokenModule.signAccessToken;
  request = supertestModule.default;

  customerRole = await prisma.role.findFirst({
    where: { name: 'customer' },
  });

  if (!customerRole) {
    throw new Error('Customer role not found.');
  }

  testUser = await prisma.user.create({
    data: {
      roleId: customerRole.id,
      email: `review-route-${Date.now()}@test.com`,
      passwordHash: 'test-password-hash',
      firstName: 'Route',
      lastName: 'Tester',
    },
  });

  otherUser = await prisma.user.create({
    data: {
      roleId: customerRole.id,
      email: `review-route-other-${Date.now()}@test.com`,
      passwordHash: 'test-password-hash',
      firstName: 'Other',
      lastName: 'Tester',
    },
  });

  accessToken = signAccessToken({
    id: testUser.id,
    role: 'customer',
    email: testUser.email,
  });

  otherAccessToken = signAccessToken({
    id: otherUser.id,
    role: 'customer',
    email: otherUser.email,
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
      title: 'Review Route Test Game',
      slug: `review-route-test-game-${Date.now()}`,
      description: 'Product used for review route tests.',
      price: 450.0,
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
      subtotal: 450.0,
      total: 450.0,
      items: {
        create: {
          productId: testProduct.id,
          productTitle: testProduct.title,
          quantity: 1,
          unitPrice: 450.0,
        },
      },
      payment: {
        create: {
          method: 'card',
          status: 'completed',
          transactionRef: `ROUTE-TEST-${Date.now()}`,
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
      comment: 'Route integration test review.',
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

  await prisma.$disconnect();
});

describe('Review routes', () => {
  describe('GET /api/v1/products/:productId/reviews', () => {
    it('returns reviews for a product without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/products/${testProduct.id}/reviews`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: testReview.id,
            productId: testProduct.id,
            rating: 4,
          }),
        ])
      );
    });
  });

  describe('POST /api/v1/products/:productId/reviews', () => {
    it('rejects unauthenticated review creation', async () => {
      const response = await request(app)
        .post(`/api/v1/products/${testProduct.id}/reviews`)
        .send({
          rating: 5,
          comment: 'Great game!',
        });

      expect(response.status).toBe(401);
    });

    it('creates a review for an authenticated user who purchased the product', async () => {
      const newProduct = await prisma.product.create({
        data: {
          title: 'Second Review Route Game',
          slug: `second-review-route-game-${Date.now()}`,
          description: 'Product used for route review creation.',
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
          status: 'paid',
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
              transactionRef: `ROUTE-SUBMIT-${Date.now()}`,
              paidAt: new Date(),
            },
          },
        },
      });

      const response = await request(app)
        .post(`/api/v1/products/${newProduct.id}/reviews`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          rating: 5,
          comment: 'Excellent game!',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        userId: testUser.id,
        productId: newProduct.id,
        rating: 5,
        comment: 'Excellent game!',
      });

      await prisma.review.delete({
        where: {
          id: response.body.id,
        },
      });

      await prisma.payment.delete({
        where: {
          orderId: order.id,
        },
      });

      await prisma.orderItem.deleteMany({
        where: {
          orderId: order.id,
        },
      });

      await prisma.order.delete({
        where: {
          id: order.id,
        },
      });

      await prisma.product.delete({
        where: {
          id: newProduct.id,
        },
      });
    });
  });

  describe('PUT /api/v1/reviews/:id', () => {
    it('allows the owner to update their review', async () => {
      const response = await request(app)
        .put(`/api/v1/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          rating: 5,
          comment: 'Updated through the API.',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: testReview.id,
        userId: testUser.id,
        rating: 5,
        comment: 'Updated through the API.',
      });
    });

    it('rejects another user from updating the review', async () => {
      const response = await request(app)
        .put(`/api/v1/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          rating: 1,
          comment: 'I should not be able to edit this.',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/reviews/:id', () => {
    it('rejects another user from deleting the review', async () => {
      const response = await request(app)
        .delete(`/api/v1/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${otherAccessToken}`);

      expect(response.status).toBe(403);
    });

    it('allows the owner to delete their review', async () => {
      const response = await request(app)
        .delete(`/api/v1/reviews/${testReview.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      const deletedReview = await prisma.review.findUnique({
        where: {
          id: testReview.id,
        },
      });

      expect(deletedReview).toBeNull();
    });
  });
});