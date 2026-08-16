import { hashPassword, comparePassword } from '../../src/utils/hash.js';

describe('password hashing', () => {
  it('should hash a password and successfully verify it', async () => {
    const plainPassword = 'mySecurePassword123';

    const hash = await hashPassword(plainPassword);

    expect(hash).not.toBe(plainPassword);
    expect(typeof hash).toBe('string');

    const isMatch = await comparePassword(plainPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject an incorrect password against a valid hash', async () => {
    const plainPassword = 'mySecurePassword123';
    const wrongPassword = 'notThePassword';

    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword(wrongPassword, hash);

    expect(isMatch).toBe(false);
  });
});