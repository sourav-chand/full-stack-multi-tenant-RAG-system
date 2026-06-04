import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  createTenant,
  getTenant,
  listTenants,
  deleteTenant
} from '../../services/tenant';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes')
});

const idParam = z.object({ id: z.string().uuid() });

export const tenantRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', requireAuth());

  app.post(
    '/tenant',
    { preHandler: requireRole('superadmin', 'tenant_admin') },
    async (req, reply) => {
      const body = createSchema.parse(req.body);
      const tenant = await createTenant(body);
      reply.code(201).send(tenant);
    }
  );

  app.get('/tenant', async () => {
    const tenants = await listTenants();
    return { tenants };
  });

  app.get('/tenant/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    return getTenant(id);
  });

  app.delete(
    '/tenant/:id',
    { preHandler: requireRole('superadmin') },
    async (req) => {
      const { id } = idParam.parse(req.params);
      await deleteTenant(id);
      return { ok: true };
    }
  );
};
