import { signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken, } from '../../src/utils/tokens.js';

describe('access tokens', () => {
  it('should sign a token and verify it back to the same userId', () => {
    const userId = 'test-user-id-123';
    const token = signAccessToken(userId);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(userId);
  });

  it('should throw when verifying a malformed token', () => {
    expect(() => {
      verifyAccessToken('not-a-real-token');
    }).toThrow();
  });
});

describe('refresh tokens', () => {
  it('should generate a random token string each time', () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();
    expect(typeof token1).toBe('string');
    expect(token1).not.toBe(token2);
  });

  it('should produce the same hash for the same input, consistently', () => {
    const token = 'some-fixed-refresh-token-value';
    const hash1 = hashRefreshToken(token);
    const hash2 = hashRefreshToken(token);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hashA = hashRefreshToken('token-a');
    const hashB = hashRefreshToken('token-b');
    expect(hashA).not.toBe(hashB);
  });
});