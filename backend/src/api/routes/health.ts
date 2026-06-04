import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { pingDatabase } from '../../config/db';
import { pingRedis } from '../../config/redis';
import { pingQdrant } from '../../config/qdrant';

export const healthRoutes: FastifyPluginAsync = async (
  app: FastifyInstance
) => {
  app.get('/health', async (_req, reply) => {
    const [pg, rd, qd] = await Promise.all([
      pingDatabase(),
      pingRedis(),
      pingQdrant()
    ]);
    const ok = pg && rd && qd;
    reply.code(ok ? 200 : 503).send({
      status: ok ? 'ok' : 'degraded',
      services: {
        postgres: pg ? 'up' : 'down',
        redis: rd ? 'up' : 'down',
        qdrant: qd ? 'up' : 'down'
      },
      timestamp: new Date().toISOString()
    });
  });
};
