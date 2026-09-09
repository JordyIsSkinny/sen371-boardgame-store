import { prisma } from '../lib/prismaClient.js';

// role, not roleId: login/register (user.repository.js) already return
// user.role as a resolved string, and the client's AdminRoute guard checks
// user.role === 'admin'. Returning the raw FK here instead left an admin
// redirected away from /admin on every reload, since the silent-refresh path
// uses GET /users/me for the full profile.
const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
};

function toPublicUser(user) {
  if (!user) return null;
  const { role, ...rest } = user;
  return { ...rest, role: role?.name };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: PUBLIC_USER_FIELDS,
  });
  return toPublicUser(user);
}

export async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: PUBLIC_USER_FIELDS,
    orderBy: { createdAt: 'desc' },
  });
  return users.map(toPublicUser);
}

export async function updateUser(id, data) {
  // security-addendum.md "Users": PUT /users/me may set first_name/last_name/email,
  // never role_id. email was missing from this whitelist.
  const allowedFields = ['firstName', 'lastName', 'email'];
  const safeData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) safeData[key] = data[key];
  }

  const user = await prisma.user.update({
    where: { id },
    data: safeData,
    select: PUBLIC_USER_FIELDS,
  });
  return toPublicUser(user);
}