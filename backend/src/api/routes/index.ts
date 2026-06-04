import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { tenantRoutes } from './tenant';
import { documentRoutes } from './documents';
import { queryRoutes } from './query';

export const apiRoutes: FastifyPluginAsync = async (
  app: FastifyInstance
) => {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(tenantRoutes);
  await app.register(documentRoutes);
  await app.register(queryRoutes);
};
