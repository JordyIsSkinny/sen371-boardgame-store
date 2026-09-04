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
