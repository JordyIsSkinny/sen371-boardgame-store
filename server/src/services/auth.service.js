import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  verifyAgainstDummyHash,
} from './password.service.js';

import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from './token.service.js';

import AppError from '../errors/app-error.js';

/**
 * Repositories are injected rather than imported so that this service depends
 * on an interface rather than on Prisma directly — the Repository pattern
 * justified in System Plan 3.2. It also means the service is fully testable
 * without a database.
 */
export function createAuthService({ userRepository, refreshTokenRepository }) {
  /** Strips password_hash before a user ever leaves the service layer. */
  function toPublicUser(user) {
    const { password_hash, ...safe } = user;
    return safe;
  }

  async function issueTokens(user) {
    const accessToken = signAccessToken(user);
    const refreshToken = generateRefreshToken();

    await refreshTokenRepository.create({
      user_id: user.id,
      token_hash: hashRefreshToken(refreshToken),
      expires_at: refreshTokenExpiry(),
    });

    return { accessToken, refreshToken };
  }

  async function register({ first_name, last_name, email, password }) {
    const violations = validatePasswordPolicy(password);
    if (violations.length > 0) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Request validation failed',
        violations.map((issue) => ({ field: 'password', issue }))
      );
    }

    const normalisedEmail = String(email).trim().toLowerCase();

    if (await userRepository.findByEmail(normalisedEmail)) {
      throw new AppError(409, 'EMAIL_IN_USE', 'That email address is already registered');
    }

    // role is set here, never taken from the request — otherwise anyone could
    // register themselves as an administrator by adding a field to the body.
    const user = await userRepository.create({
      first_name,
      last_name,
      email: normalisedEmail,
      password_hash: await hashPassword(password),
      role: 'customer',
    });

    return { user: toPublicUser(user), ...(await issueTokens(user)) };
  }

  async function login({ email, password }) {
    const normalisedEmail = String(email ?? '').trim().toLowerCase();
    const user = await userRepository.findByEmail(normalisedEmail);

    // Unknown email still costs a bcrypt comparison. Without this the response
    // returns far faster than for a real account, letting an attacker
    // enumerate registered addresses by timing alone.
    if (!user) {
      await verifyAgainstDummyHash();
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    if (!(await verifyPassword(password, user.password_hash))) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    return { user: toPublicUser(user), ...(await issueTokens(user)) };
  }

  return { register, login };
}
