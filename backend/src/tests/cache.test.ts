import { queryCacheKey, invalidateTenantQueries } from '../services/cache';
import { redis } from '../config/redis';

describe('cache.key', () => {
  test('produces deterministic, lowercase, trimmed hash', () => {
    const k1 = queryCacheKey('t1', 'What is the policy?');
    const k2 = queryCacheKey('t1', '  what is the policy?  ');
    const k3 = queryCacheKey('t1', 'WHAT IS THE POLICY?');
    expect(k1).toBe(k2);
    expect(k1).toBe(k3);
    expect(k1).toMatch(/^query:t1:[a-f0-9]{64}$/);
  });

  test('different queries yield different keys', () => {
    expect(queryCacheKey('t1', 'a')).not.toBe(queryCacheKey('t1', 'b'));
  });

  test('different tenants yield different keys', () => {
    expect(queryCacheKey('t1', 'a')).not.toBe(queryCacheKey('t2', 'a'));
  });
});

describe('cache.invalidateTenantQueries', () => {
  afterAll(async () => {
    await redis.quit();
  });

  test('removes only keys for the target tenant', async () => {
    await redis.set(queryCacheKey('tenantA', 'q1'), 'a', 'EX', 60);
    await redis.set(queryCacheKey('tenantA', 'q2'), 'b', 'EX', 60);
    await redis.set(queryCacheKey('tenantB', 'q1'), 'c', 'EX', 60);

    await invalidateTenantQueries('tenantA');

    expect(await redis.get(queryCacheKey('tenantA', 'q1'))).toBeNull();
    expect(await redis.get(queryCacheKey('tenantA', 'q2'))).toBeNull();
    expect(await redis.get(queryCacheKey('tenantB', 'q1'))).toBe('c');

    await redis.del(queryCacheKey('tenantB', 'q1'));
  });
});
