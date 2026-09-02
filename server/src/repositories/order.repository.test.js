import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createOrder, getOrdersByUser, getOrderById } from './order.repository.js';

const prisma = new PrismaClient();
let testUser, testRole, testProduct, testAddress;

beforeAll(async () => {
  testRole = await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: { name: 'customer' },
  });

  testUser = await prisma.user.create({
    data: {
      roleId: testRole.id,
      email: `order-test-${Date.now()}@example.com`,
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
      title: 'Catan',
      slug: `catan-test-${Date.now()}`,
      minPlayers: 3,
      maxPlayers: 4,
      playTimeMinutes: 90,
      minAge: 10,
      complexityRating: 2.3,
      price: 650.0,
      inventory: { create: { quantityOnHand: 50 } },
    },
  });
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { productId: testProduct.id } });
  await prisma.order.deleteMany({ where: { userId: testUser.id } });
  await prisma.inventory.deleteMany({ where: { productId: testProduct.id } });
  await prisma.product.delete({ where: { id: testProduct.id } });
  await prisma.address.delete({ where: { id: testAddress.id } });
  await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.$disconnect();
});

describe('createOrder', () => {
  it(
    'creates an order with items and decrements inventory',
    async () => {
      const order = await createOrder({
        userId: testUser.id,
        addressId: testAddress.id,
        items: [{ productId: testProduct.id, quantity: 2 }],
      });

      expect(order).not.toBeNull();
      expect(Number(order.total)).toBe(1300);

      const updatedInventory = await prisma.inventory.findUnique({
        where: { productId: testProduct.id },
      });
      expect(updatedInventory.quantityOnHand).toBe(48);
    },
    15000
  );

  it('throws when requested quantity exceeds stock', async () => {
    await expect(
      createOrder({
        userId: testUser.id,
        addressId: testAddress.id,
        items: [{ productId: testProduct.id, quantity: 999 }],
      })
    ).rejects.toThrow();
  });
});

describe('getOrdersByUser', () => {
  it(
    'returns orders belonging to the user',
    async () => {
      const order = await createOrder({
        userId: testUser.id,
        addressId: testAddress.id,
        items: [{ productId: testProduct.id, quantity: 1 }],
      });

      const orders = await getOrdersByUser(testUser.id);
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.some((o) => o.id === order.id)).toBe(true);
    },
    15000
  );
});

describe('getOrderById', () => {
  it(
    'returns the order with its items',
    async () => {
      const created = await createOrder({
        userId: testUser.id,
        addressId: testAddress.id,
        items: [{ productId: testProduct.id, quantity: 1 }],
      });

      const found = await getOrderById(created.id);
      expect(found).not.toBeNull();
      expect(found.items.length).toBeGreaterThan(0);
    },
    15000
  );

  it('returns null for a nonexistent order', async () => {
    const found = await getOrderById(999999);
    expect(found).toBeNull();
  });
});