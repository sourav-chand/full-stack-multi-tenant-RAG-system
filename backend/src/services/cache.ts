import crypto from 'node:crypto';
import { redis } from '../config/redis';
import type { GeneratedAnswer } from '../rag/generator';

const TTL_SECONDS = 5 * 60;

function hashKey(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function queryCacheKey(tenantId: string, query: string): string {
  return `query:${tenantId}:${hashKey(query.toLowerCase().trim())}`;
}

export async function getCachedAnswer(
  tenantId: string,
  query: string
): Promise<GeneratedAnswer | null> {
  const key = queryCacheKey(tenantId, query);
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GeneratedAnswer;
  } catch {
    return null;
  }
}

export async function setCachedAnswer(
  tenantId: string,
  query: string,
  value: GeneratedAnswer
): Promise<void> {
  const key = queryCacheKey(tenantId, query);
  await redis.set(key, JSON.stringify(value), 'EX', TTL_SECONDS);
}

export async function invalidateTenantQueries(tenantId: string): Promise<void> {
  const pattern = `query:${tenantId}:*`;
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = next;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}
