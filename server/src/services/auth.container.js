import { createAuthService } from './auth.service.js';
import * as userRepository from '../repositories/user.repository.js';
import * as refreshTokenRepository from '../repositories/refresh-token.repository.js';

/**
 * Single wiring point for the auth service. The service itself takes its
 * repositories as arguments, which is what lets its unit tests run against
 * mocks with no database. This module is the one place the real Prisma-backed
 * implementations get attached.
 *
 * Controllers import authService from here rather than constructing it, so
 * there is exactly one instance and one place to change if the repositories
 * ever move.
 */
export const authService = createAuthService({
  userRepository,
  refreshTokenRepository,
});
