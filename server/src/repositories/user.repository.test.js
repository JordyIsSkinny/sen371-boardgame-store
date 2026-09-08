import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prismaClient.js';
import { getUserById, updateUser, getAllUsers } from './user.repository.js';

let testUser, testRole;

beforeAll(async () => {
  testRole = await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: { name: 'customer' },
  });

  testUser = await prisma.user.create({
    data: {
      roleId: testRole.id,
      email: `user-repo-test-${Date.now()}@example.com`,
      passwordHash: 'not-a-real-hash',
      firstName: 'Test',
      lastName: 'User',
    },
  });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.$disconnect();
});

describe('getUserById', () => {
  it('returns the user when it exists', async () => {
    const result = await getUserById(testUser.id);
    expect(result).not.toBeNull();
    expect(result.email).toBe(testUser.email);
  });

  it('does not return the password hash', async () => {
    const result = await getUserById(testUser.id);
    expect(result.passwordHash).toBeUndefined();
  });

  it('returns null when the user does not exist', async () => {
    const result = await getUserById(999999);
    expect(result).toBeNull();
  });
});

describe('updateUser', () => {
  it('updates allowed fields', async () => {
    const updated = await updateUser(testUser.id, { firstName: 'Updated' });
    expect(updated.firstName).toBe('Updated');
  });
});

describe('getAllUsers', () => {
  it('returns a list including the seeded test user', async () => {
    const results = await getAllUsers();
    expect(Array.isArray(results)).toBe(true);
    expect(results.some((u) => u.id === testUser.id)).toBe(true);
  });

  it('does not return password hashes', async () => {
    const results = await getAllUsers();
    expect(results.every((u) => u.passwordHash === undefined)).toBe(true);
  });
});