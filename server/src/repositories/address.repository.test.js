import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prismaClient.js';
import { createAddress, getAddressesByUser } from './address.repository.js';

let testRole;
let testUser;
let otherUser;
const createdAddressIds = [];

beforeAll(async () => {
  testRole = await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: { name: 'customer' },
  });

  testUser = await prisma.user.create({
    data: {
      roleId: testRole.id,
      email: `address-test-${Date.now()}@example.com`,
      passwordHash: 'not-a-real-hash',
      firstName: 'Address',
      lastName: 'Tester',
    },
  });

  otherUser = await prisma.user.create({
    data: {
      roleId: testRole.id,
      email: `address-test-other-${Date.now()}@example.com`,
      passwordHash: 'not-a-real-hash',
      firstName: 'Other',
      lastName: 'Tester',
    },
  });
}, 30000);

afterAll(async () => {
  if (createdAddressIds.length > 0) {
    await prisma.address.deleteMany({ where: { id: { in: createdAddressIds } } });
  }
  if (testUser) {
    await prisma.user.delete({ where: { id: testUser.id } });
  }
  if (otherUser) {
    await prisma.user.delete({ where: { id: otherUser.id } });
  }
  await prisma.$disconnect();
});

describe('createAddress', () => {
  it('creates an address owned by the given user', async () => {
    const address = await createAddress({
      userId: testUser.id,
      line1: '1 Review Street',
      city: 'Pretoria',
      provinceState: 'Gauteng',
      postalCode: '0001',
      country: 'South Africa',
    });
    createdAddressIds.push(address.id);

    expect(address).not.toBeNull();
    expect(address.userId).toBe(testUser.id);
    expect(address.line1).toBe('1 Review Street');
    expect(address.city).toBe('Pretoria');
    expect(address.isDefault).toBe(false);
  });

  it('accepts an optional line2 and isDefault', async () => {
    const address = await createAddress({
      userId: testUser.id,
      line1: '2 Review Street',
      line2: 'Unit 4',
      city: 'Pretoria',
      provinceState: 'Gauteng',
      postalCode: '0001',
      country: 'South Africa',
      isDefault: true,
    });
    createdAddressIds.push(address.id);

    expect(address.line2).toBe('Unit 4');
    expect(address.isDefault).toBe(true);
  });
});

describe('getAddressesByUser', () => {
  it("returns only the given user's addresses, not other users'", async () => {
    const otherAddress = await prisma.address.create({
      data: {
        userId: otherUser.id,
        line1: '9 Other Street',
        city: 'Cape Town',
        provinceState: 'Western Cape',
        postalCode: '8001',
        country: 'South Africa',
      },
    });
    createdAddressIds.push(otherAddress.id);

    const result = await getAddressesByUser(testUser.id);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every((a) => a.userId === testUser.id)).toBe(true);
    expect(result.some((a) => a.id === otherAddress.id)).toBe(false);
  });
});
