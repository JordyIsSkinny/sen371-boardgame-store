import { prisma } from '../lib/prismaClient.js';

const PUBLIC_USER_FIELDS = {
  id: true,
  roleId: true,
  email: true,
  firstName: true,
  lastName: true,
  createdAt: true,
  updatedAt: true,
};

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: PUBLIC_USER_FIELDS,
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: PUBLIC_USER_FIELDS,
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateUser(id, data) {
  // security-addendum.md "Users": PUT /users/me may set first_name/last_name/email,
  // never role_id. email was missing from this whitelist.
  const allowedFields = ['firstName', 'lastName', 'email'];
  const safeData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) safeData[key] = data[key];
  }

  return prisma.user.update({
    where: { id },
    data: safeData,
    select: PUBLIC_USER_FIELDS,
  });
}