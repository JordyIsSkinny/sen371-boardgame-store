import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const POLICY = [
  { test: (p) => p.length >= 8, issue: 'must be at least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), issue: 'must contain an uppercase letter' },
  { test: (p) => /[a-z]/.test(p), issue: 'must contain a lowercase letter' },
  { test: (p) => /[0-9]/.test(p), issue: 'must contain a digit' },
];

/**
 * Returns an array of policy violations. Empty array means the password is
 * acceptable. Every failing rule is reported, not just the first, so the
 * client can render the full checklist shown on wireframe S6.
 */
export function validatePasswordPolicy(password) {
  if (typeof password !== 'string') {
    return ['must be a string'];
  }
  return POLICY.filter((rule) => !rule.test(password)).map((rule) => rule.issue);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Computed once at module load. Used when a login attempt names an email that
 * does not exist: without this the request would return noticeably faster than
 * one for a real account, letting an attacker enumerate registered addresses
 * by timing alone. Login must call this on the unknown-email path so both
 * outcomes cost the same bcrypt comparison.
 */
const DUMMY_HASH = bcrypt.hashSync('timing-equalisation-placeholder', SALT_ROUNDS);

export async function verifyAgainstDummyHash() {
  await bcrypt.compare('timing-equalisation-placeholder', DUMMY_HASH);
  return false;
}
