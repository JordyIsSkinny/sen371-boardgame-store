import { prisma } from '../lib/prismaClient.js';

/**
 * Translates between the domain shape the auth service speaks (snake_case,
 * matching the API contracts) and Prisma's camelCase model fields. Keeping
 * that mapping here rather than in the service is the point of the Repository
 * pattern from System Plan 3.2: the service never learns that roles live in a
 * lookup table, or that the column is password_hash.
 */
function toDomain(user) {
  if (!user) return null;
  return {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    role: user.role?.name,
    password_hash: user.passwordHash,
  };
}

/** Role is always needed alongside the user, for the JWT claim. */
const WITH_ROLE = { include: { role: true } };

export async function findByEmail(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    ...WITH_ROLE,
  });
  return toDomain(user);
}

export async function findById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    ...WITH_ROLE,
  });
  return toDomain(user);
}

export async function create({
  first_name,
  last_name,
  email,
  password_hash,
  role,
}) {
  const roleRecord = await prisma.role.findUnique({ where: { name: role } });

  if (!roleRecord) {
    // Almost always means the roles table has not been seeded. Failing with a
    // clear message beats a foreign key violation from Postgres.
    throw new Error(
      `Role "${role}" not found. Has the roles table been seeded?`
    );
  }

  const user = await prisma.user.create({
    data: {
      firstName: first_name,
      lastName: last_name,
      email,
      passwordHash: password_hash,
      roleId: roleRecord.id,
    },
    ...WITH_ROLE,
  });

  return toDomain(user);
}
