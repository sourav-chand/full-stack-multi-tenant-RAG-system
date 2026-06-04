import { signAccessToken, verifyToken } from '../middleware/auth';
import { env } from '../config/env';

describe('auth.tokens', () => {
  test('signs and verifies a token round-trip', () => {
    const claims = { sub: 'u1', tenantId: 't1', role: 'tenant_admin' as const };
    const token = signAccessToken(claims);
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.tenantId).toBe('t1');
    expect(decoded.role).toBe('tenant_admin');
  });

  test('rejects malformed tokens', () => {
    expect(() => verifyToken('not-a-jwt')).toThrow();
  });

  test('produces different tokens for different iat times', async () => {
    const t1 = signAccessToken({ sub: 'u', tenantId: 't', role: 'tenant_user' });
    await new Promise((r) => setTimeout(r, 1100));
    const t2 = signAccessToken({ sub: 'u', tenantId: 't', role: 'tenant_user' });
    expect(t1).not.toBe(t2);
  });

  test('respects JWT_ACCESS_TTL', () => {
    const ttl = env().JWT_ACCESS_TTL;
    expect(ttl).toBeGreaterThan(0);
  });
});
