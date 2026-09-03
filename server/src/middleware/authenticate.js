import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../services/token.service.js';

import AppError from '../errors/app-error.js';
import UnauthorizedError from '../errors/unauthorized-error.js';

const BEARER = 'Bearer ';

/**
 * Verifies the access token and attaches the caller's identity to req.user.
 *
 * Identity comes from the token's own claims rather than a database lookup.
 * The trade-off: a role change or account deletion is not reflected until the
 * current access token expires, at most 15 minutes. In exchange, every
 * authenticated request avoids a query, and this middleware stays independent
 * of the schema. For a system where roles effectively never change after
 * registration, that is the right side of the trade.
 *
 * Nothing downstream should ever read the raw token ΓÇö controllers and
 * services see only req.user. That boundary is what makes auth swappable.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER)) {
    return next(new UnauthorizedError('Authentication required.'));
  }

  const token = header.slice(BEARER.length).trim();

  if (!token) {
    return next(new UnauthorizedError('Authentication required.'));
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      // sub is a string per the JWT spec, but every id in the schema is an
      // integer. Without this conversion, ownership checks comparing
      // item.userId !== req.user.id fail silently on a type mismatch.
      id: Number(payload.sub),
      role: payload.role,
      email: payload.email,
    };

    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // Distinct code so the client can attempt a silent refresh instead of
      // dropping the user back to the login screen.
      // AppError directly, since UnauthorizedError fixes the code to UNAUTHORIZED
      return next(
        new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired.')
      );
    }

    // Malformed, wrong signature, or an unaccepted algorithm. Deliberately
    // one generic message ΓÇö telling a caller which of those it was only
    // helps someone probing the endpoint.
    return next(new UnauthorizedError('Invalid access token.'));
  }
}