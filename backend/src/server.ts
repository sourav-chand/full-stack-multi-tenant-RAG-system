import { buildApp } from './app';
import { env } from './config/env';
import { prisma } from './config/db';
import { redis } from './config/redis';

async function main(): Promise<void> {
  const app = await buildApp();
  const port = env().PORT;
  const host = env().HOST;

  try {
    await app.listen({ port, host });
    app.log.info(`Multi-tenant RAG API ready on http://${host}:${port}/api`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down…`);
    try {
      await app.close();
      await prisma.$disconnect();
      redis.disconnect();
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
