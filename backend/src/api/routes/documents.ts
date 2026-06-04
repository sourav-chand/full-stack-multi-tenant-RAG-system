import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth';
import { requireTenantMatch } from '../../middleware/tenant';
import {
  ingestPdf,
  listDocuments,
  deleteDocument,
  getDocument
} from '../../services/document';

const tenantParam = z.object({ tenantId: z.string().uuid() });
const documentParam = z.object({
  tenantId: z.string().uuid(),
  documentId: z.string().uuid()
});

export const documentRoutes: FastifyPluginAsync = async (
  app: FastifyInstance
) => {
  app.addHook('preHandler', requireAuth());
  app.addHook('preHandler', requireTenantMatch('tenantId'));

  app.post(
    '/tenant/:tenantId/documents',
    { preHandler: requireRole('tenant_admin', 'tenant_user', 'superadmin') },
    async (req, reply) => {
      const { tenantId } = tenantParam.parse(req.params);
      const file = await req.file({
        limits: { fileSize: 50 * 1024 * 1024 }
      });
      if (!file) {
        reply.code(400).send({
          error: 'Missing file field "file"',
          code: 'BAD_REQUEST'
        });
        return;
      }
      if (file.mimetype !== 'application/pdf') {
        reply.code(415).send({
          error: 'Only application/pdf is accepted',
          code: 'UNSUPPORTED_MEDIA_TYPE'
        });
        return;
      }
      const buffer = await file.toBuffer();
      const doc = await ingestPdf(tenantId, {
        filename: file.filename,
        buffer
      });
      reply.code(201).send(doc);
    }
  );

  app.get('/tenant/:tenantId/documents', async (req) => {
    const { tenantId } = tenantParam.parse(req.params);
    const docs = await listDocuments(tenantId);
    return { documents: docs };
  });

  app.get('/tenant/:tenantId/documents/:documentId', async (req) => {
    const { tenantId, documentId } = documentParam.parse(req.params);
    return getDocument(tenantId, documentId);
  });

  app.delete(
    '/tenant/:tenantId/documents/:documentId',
    { preHandler: requireRole('tenant_admin', 'superadmin') },
    async (req, reply) => {
      const { tenantId, documentId } = documentParam.parse(req.params);
      await deleteDocument(tenantId, documentId);
      reply.code(200).send({ ok: true });
    }
  );
};
