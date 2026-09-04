import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthService } from './auth.service.js';
import { hashPassword } from './password.service.js';

let userRepository;
let refreshTokenRepository;
let authService;
let existingHash;

const VALID = {
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane@example.com',
  password: 'Passw0rd123',
};

beforeEach(async () => {
  process.env.JWT_SECRET ??= 'test-access-secret';
  process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret';

  existingHash = await hashPassword('Passw0rd123');

  userRepository = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (data) => ({
      id: 1,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      role: 'customer',
    })),
  };

  refreshTokenRepository = {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    findByHash: vi.fn().mockResolvedValue(null),
    revoke: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(0),
  };

  authService = createAuthService({ userRepository, refreshTokenRepository });
});

describe('register', () => {
  it('creates the user and returns them without any password field', async () => {
    const result = await authService.register(VALID);

    expect(result.user).toMatchObject({ id: 1, email: VALID.email, role: 'customer' });
    expect(result.user).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('stores a hash, never the plaintext password', async () => {
    await authService.register(VALID);

    const stored = userRepository.create.mock.calls[0][0];
    expect(stored).not.toHaveProperty('password');
    expect(stored.password_hash).not.toBe(VALID.password);
    expect(stored.password_hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('normalises the email to lowercase', async () => {
    await authService.register({ ...VALID, email: 'JANE@Example.COM' });

    expect(userRepository.create.mock.calls[0][0].email).toBe('jane@example.com');
    expect(userRepository.findByEmail).toHaveBeenCalledWith('jane@example.com');
  });

  it('assigns the customer role, ignoring any role supplied by the client', async () => {
    await authService.register({ ...VALID, role: 'admin' });

    expect(userRepository.create.mock.calls[0][0].role).toBe('customer');
  });

  it('returns an access token and a refresh token', async () => {
    const result = await authService.register(VALID);

    expect(typeof result.accessToken).toBe('string');
    expect(result.refreshToken).toMatch(/^[0-9a-f]{80}$/);
  });

  it('persists the refresh token hashed, not raw', async () => {
    const result = await authService.register(VALID);

    const stored = refreshTokenRepository.create.mock.calls[0][0];
    expect(stored.token_hash).not.toBe(result.refreshToken);
    expect(stored.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.expires_at).toBeInstanceOf(Date);
  });

  it('rejects a password failing the policy, listing every violation', async () => {
    await expect(authService.register({ ...VALID, password: 'abc' })).rejects.toMatchObject({
      status: 422,
      error: 'VALIDATION_ERROR',
    });

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('rejects an email already in use', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: 9, email: VALID.email });

    await expect(authService.register(VALID)).rejects.toMatchObject({
      status: 409,
      error: 'EMAIL_IN_USE',
    });

    expect(userRepository.create).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  beforeEach(() => {
    userRepository.findByEmail.mockResolvedValue({
      id: 1,
      first_name: 'Jane',
      last_name: 'Smith',
      email: VALID.email,
      role: 'customer',
      password_hash: existingHash,
    });
  });

  it('returns the user and a token pair for correct credentials', async () => {
    const result = await authService.login({
      email: VALID.email,
      password: VALID.password,
    });

    expect(result.user.id).toBe(1);
    expect(typeof result.accessToken).toBe('string');
    expect(result.refreshToken).toMatch(/^[0-9a-f]{80}$/);
  });

  it('never returns the password hash', async () => {
    const result = await authService.login({
      email: VALID.email,
      password: VALID.password,
    });

    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('rejects a wrong password with 401 UNAUTHORIZED', async () => {
    await expect(
      authService.login({ email: VALID.email, password: 'Wrongpass1' })
    ).rejects.toMatchObject({ status: 401, error: 'UNAUTHORIZED' });
  });

  it('rejects an unknown email with the identical error', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'nobody@example.com', password: 'Passw0rd123' })
    ).rejects.toMatchObject({ status: 401, error: 'UNAUTHORIZED' });
  });

  it('gives the same message for unknown email and wrong password', async () => {
    const wrongPassword = await authService
      .login({ email: VALID.email, password: 'Wrongpass1' })
      .catch((e) => e.message);

    userRepository.findByEmail.mockResolvedValue(null);

    const unknownEmail = await authService
      .login({ email: 'nobody@example.com', password: 'Passw0rd123' })
      .catch((e) => e.message);

    expect(wrongPassword).toBe(unknownEmail);
  });

  it('still performs a hash comparison when the email is unknown', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    const start = performance.now();
    await authService
      .login({ email: 'nobody@example.com', password: 'Passw0rd123' })
      .catch(() => {});
    const elapsed = performance.now() - start;

    // A bcrypt comparison at cost 12 is not instantaneous. Returning in
    // near-zero time would reveal that no account exists.
    expect(elapsed).toBeGreaterThan(20);
  });

  it('does not issue a refresh token on failure', async () => {
    await authService
      .login({ email: VALID.email, password: 'Wrongpass1' })
      .catch(() => {});

    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
  });
});

describe('refresh', () => {
  const RAW_TOKEN = 'a'.repeat(80);
  const STORED_USER = {
    id: 1,
    first_name: 'Jane',
    last_name: 'Smith',
    email: VALID.email,
    role: 'customer',
  };

  function liveRecord(overrides = {}) {
    return {
      id: 5,
      user_id: 1,
      token_hash: 'irrelevant',
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    userRepository.findById.mockResolvedValue(STORED_USER);
  });

  it('rejects when no token is presented', async () => {
    await expect(authService.refresh(undefined)).rejects.toMatchObject({
      status: 401,
      error: 'UNAUTHORIZED',
    });

    expect(refreshTokenRepository.findByHash).not.toHaveBeenCalled();
  });

  it('rejects a token with no matching stored hash', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue(null);

    await expect(authService.refresh(RAW_TOKEN)).rejects.toMatchObject({
      status: 401,
      error: 'UNAUTHORIZED',
    });
  });

  it('rejects an expired token', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue(
      liveRecord({ expires_at: new Date(Date.now() - 1000) })
    );

    await expect(authService.refresh(RAW_TOKEN)).rejects.toMatchObject({
      status: 401,
      error: 'UNAUTHORIZED',
    });

    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });

  it('revokes the old token and issues a new pair for a valid token', async () => {
    const record = liveRecord();
    refreshTokenRepository.findByHash.mockResolvedValue(record);

    const result = await authService.refresh(RAW_TOKEN);

    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(record.id);
    expect(typeof result.accessToken).toBe('string');
    expect(result.refreshToken).toMatch(/^[0-9a-f]{80}$/);
    expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);
  });

  it('treats a revoked token as reuse and revokes every token for that user', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue(
      liveRecord({ revoked_at: new Date() })
    );

    await expect(authService.refresh(RAW_TOKEN)).rejects.toMatchObject({
      status: 401,
      error: 'UNAUTHORIZED',
    });

    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(1);
  });

  it('does not issue new tokens when reuse is detected', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue(
      liveRecord({ revoked_at: new Date() })
    );

    await authService.refresh(RAW_TOKEN).catch(() => {});

    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
  });

  it('rejects when the token is live but its user no longer exists', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue(liveRecord());
    userRepository.findById.mockResolvedValue(null);

    await expect(authService.refresh(RAW_TOKEN)).rejects.toMatchObject({
      status: 401,
      error: 'UNAUTHORIZED',
    });

    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  it('revokes the presented refresh token', async () => {
    const record = { id: 5, user_id: 1, revoked_at: null };
    refreshTokenRepository.findByHash.mockResolvedValue(record);

    await authService.logout('a'.repeat(80));

    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(record.id);
  });

  it('is a no-op when no token is presented', async () => {
    await authService.logout(undefined);

    expect(refreshTokenRepository.findByHash).not.toHaveBeenCalled();
    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });

  it('is a no-op when the token matches nothing stored', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue(null);

    await authService.logout('a'.repeat(80));

    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });

  it('is a no-op when the token is already revoked', async () => {
    refreshTokenRepository.findByHash.mockResolvedValue({
      id: 5,
      user_id: 1,
      revoked_at: new Date(),
    });

    await authService.logout('a'.repeat(80));

    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });
});
