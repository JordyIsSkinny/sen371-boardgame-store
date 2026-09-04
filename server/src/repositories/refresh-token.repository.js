import { prisma } from '../lib/prismaClient.js';

function toDomain(token) {
  if (!token) return null;
  return {
    id: token.id,
    user_id: token.userId,
    token_hash: token.tokenHash,
    expires_at: token.expiresAt,
    revoked_at: token.revokedAt,
  };
}

export async function create({ user_id, token_hash, expires_at }) {
  const token = await prisma.refreshToken.create({
    data: {
      userId: user_id,
      tokenHash: token_hash,
      expiresAt: expires_at,
    },
  });
  return toDomain(token);
}

/**
 * Looked up by hash, never by raw token — the raw value is never stored, so
 * a database leak yields nothing usable. The caller hashes what the client
 * presented and searches for that.
 *
 * Returns revoked and expired tokens too, deliberately. The service needs to
 * distinguish "no such token" from "revoked token presented again", because
 * the second means replay or theft and triggers revoking every session for
 * that user.
 */
export async function findByHash(token_hash) {
  const token = await prisma.refreshToken.findUnique({
    where: { tokenHash: token_hash },
  });
  return toDomain(token);
}

export async function revoke(id) {
  const token = await prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return toDomain(token);
}

/**
 * Used on reuse detection and on password change. Only touches tokens that
 * are still live, so an already-revoked token keeps its original timestamp
 * rather than being rewritten on every subsequent sweep.
 */
export async function revokeAllForUser(user_id) {
  const result = await prisma.refreshToken.updateMany({
    where: { userId: user_id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/**
 * Housekeeping. Expired tokens are already rejected on validation, so this is
 * only about keeping the table from growing without bound. Safe to run on a
 * schedule, or never.
 */
export async function deleteExpired() {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
