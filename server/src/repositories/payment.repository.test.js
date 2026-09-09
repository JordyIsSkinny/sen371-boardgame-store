import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prismaClient.js';
import { createPayment, getPaymentByOrderId } from './payment.repository.js';

let testUser, testRole, testAddress, testProduct, testOrder;

beforeAll(async () => {
  testRole = await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: { name: 'customer' },
  });

  testUser = await prisma.user.create({
    data: {
      roleId: testRole.id,
      email: `payment-test-${Date.now()}@example.com`,
      passwordHash: 'not-a-real-hash',
      firstName: 'Test',
      lastName: 'User',
    },
  });

  testAddress = await prisma.address.create({
    data: {
      userId: testUser.id,
      line1: '1 Test Street',
      city: 'Pretoria',
      provinceState: 'Gauteng',
      postalCode: '0001',
      country: 'South Africa',
    },
  });

  testProduct = await prisma.product.create({
    data: {
      title: 'Payment Test Game',
      slug: `payment-test-${Date.now()}`,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 45,
      minAge: 8,
      complexityRating: 2.0,
      price: 300,
      inventory: { create: { quantityOnHand: 10 } },
    },
  });

  testOrder = await prisma.order.create({
    data: {
      userId: testUser.id,
      addressId: testAddress.id,
      subtotal: 300,
      shippingFee: 0,
      total: 300,
    },
  });
}, 15000);

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { orderId: testOrder.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
  await prisma.order.delete({ where: { id: testOrder.id } });
  await prisma.inventory.deleteMany({ where: { productId: testProduct.id } });
  await prisma.product.delete({ where: { id: testProduct.id } });
  await prisma.address.delete({ where: { id: testAddress.id } });
  await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.$disconnect();
});

describe('createPayment', () => {
  it(
    'creates a completed payment and marks the order as paid',
    async () => {
      const payment = await createPayment({
        orderId: testOrder.id,
        method: 'card',
      });

      expect(payment).not.toBeNull();
      expect(payment.status).toBe('completed');
      expect(payment.orderId).toBe(testOrder.id);

      const updatedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
      expect(updatedOrder.status).toBe('paid');
    },
    15000
  );

  it('throws when the order does not exist', async () => {
    await expect(createPayment({ orderId: 999999, method: 'card' })).rejects.toThrow();
  });

  it('throws when a payment already exists for the order', async () => {
    await expect(createPayment({ orderId: testOrder.id, method: 'card' })).rejects.toThrow();
  });
});

describe('getPaymentByOrderId', () => {
  it('returns the payment for the order', async () => {
    const result = await getPaymentByOrderId(testOrder.id);
    expect(result).not.toBeNull();
    expect(result.orderId).toBe(testOrder.id);
  });

  it('returns null when no payment exists for the order', async () => {
    const result = await getPaymentByOrderId(999999);
    expect(result).toBeNull();
  });
});