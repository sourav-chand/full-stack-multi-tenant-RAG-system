import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env';

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export function rateLimitPerTenant() {
  const max = env().RATE_LIMIT_MAX;
  const window = env().RATE_LIMIT_WINDOW;

  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = req.user
      ? `tenant:${req.user.tenantId}:user:${req.user.sub}`
      : `ip:${req.ip}`;

    const now = Date.now();
    const bucket = store.get(key);
    if (!bucket || bucket.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + window });
      return;
    }
    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      reply.header('Retry-After', retryAfter);
      return reply.code(429).send({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED'
      });
    }
    bucket.count += 1;
  };
}

export function registerGlobalRateLimit(app: FastifyInstance): void {
  app.addHook('onClose', async () => {
    store.clear();
  });
}
