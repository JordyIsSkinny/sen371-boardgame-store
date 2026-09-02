import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getAllMechanics } from './mechanic.repository.js';

const prisma = new PrismaClient();
let testMechanic;

beforeAll(async () => {
  testMechanic = await prisma.mechanic.create({
    data: { name: 'Worker Placement Test', slug: 'worker-placement-test' },
  });
});

afterAll(async () => {
  await prisma.mechanic.delete({ where: { id: testMechanic.id } });
  await prisma.$disconnect();
});

describe('getAllMechanics', () => {
  it('returns a list including the seeded test mechanic', async () => {
    const results = await getAllMechanics();
    expect(Array.isArray(results)).toBe(true);
    expect(results.some((m) => m.id === testMechanic.id)).toBe(true);
  });
});