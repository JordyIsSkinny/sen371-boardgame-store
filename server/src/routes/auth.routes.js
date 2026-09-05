import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate } from '../middleware/authenticate.js';
import {
  register,
  login,
  refresh,
  logout,
  me,
} from '../controllers/auth.controller.js';

/**
 * System Plan 8.4: 5 requests per minute per IP on the credential endpoints.
 * Without this, an attacker can attempt passwords as fast as the network
 * allows, and bcrypt's cost factor only slows each attempt rather than
 * limiting how many are possible.
 *
 * Applied to register as well as login, since repeated registration attempts
 * are how an attacker probes which emails already exist via the 409.
 */
const credentialLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many attempts. Try again in a minute.',
  },
});

/**
 * Refresh is rate limited more loosely: a legitimate client calls it roughly
 * every 15 minutes, but a user with several tabs open will call it more
 * often, and locking them out would break the silent-refresh flow.
 */
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many refresh attempts. Try again in a minute.',
  },
});

const router = Router();

router.post('/register', credentialLimiter, register);
router.post('/login', credentialLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', authenticate, logout);

// Mounted here for convenience; belongs under /users per System Plan 8.1.
// See userRoutes if that move happens before submission.
router.get('/me', authenticate, me);

export default router;
