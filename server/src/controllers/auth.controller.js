import { authService } from '../services/auth.container.js';

const REFRESH_COOKIE = 'refreshToken';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * SameSite=None is required, not a preference: the client is served from
 * github.io and the API from onrender.com, which browsers treat as
 * cross-site. System Plan 8.2 specifies Strict, which would mean the cookie
 * is never transmitted and /auth/refresh fails for every user in production
 * while working perfectly on localhost.
 *
 * Path scopes the cookie to the auth routes, so it is not attached to every
 * catalogue or cart request that has no use for it.
 */
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: SEVEN_DAYS_MS,
  };
}

/**
 * The refresh token is set as a cookie and deliberately omitted from the
 * response body. Returning it in JSON would put it within reach of any
 * injected script, which is the exact exposure httpOnly exists to prevent.
 */
function sendAuthResponse(res, status, { user, accessToken, refreshToken }) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return res.status(status).json({ user, accessToken });
}

export async function register(req, res, next) {
  try {
    const { first_name, last_name, email, password } = req.body ?? {};
    const result = await authService.register({
      first_name,
      last_name,
      email,
      password,
    });
    return sendAuthResponse(res, 201, result);
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    const result = await authService.login({ email, password });
    return sendAuthResponse(res, 200, result);
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];
    const result = await authService.refresh(presented);

    // Rotation: the presented token is revoked and a new one issued, so a
    // stolen token is usable at most once before the theft is detectable.
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
    return res.status(200).json({ accessToken: result.accessToken });
  } catch (err) {
    // Clear the cookie on any failure. Leaving a known-bad token in the
    // browser means the client retries with it on every page load.
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

/**
 * Per System Plan 8.1 the current-user endpoint lives under /users, not
 * /auth. Kept here because it reads only what authenticate already attached,
 * so it needs no user service.
 */
export async function me(req, res) {
  return res.status(200).json({ user: req.user });
}
