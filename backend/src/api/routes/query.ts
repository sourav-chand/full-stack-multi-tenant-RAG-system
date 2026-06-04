import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { requireTenantMatch } from '../../middleware/tenant';
import { checkPromptInjection } from '../../rag/guardrails';
import { retrieve } from '../../rag/retriever';
import { generateAnswer } from '../../rag/generator';
import { getCachedAnswer, setCachedAnswer } from '../../services/cache';

const querySchema = z.object({
  query: z.string().min(1).max(2000)
});

const tenantParam = z.object({ tenantId: z.string().uuid() });

export interface QueryResponse {
  answer: string;
  sources: Array<{
    documentId: string;
    filename: string;
    excerpt: string;
    similarity: number;
    chunkIndex: number;
  }>;
  confidence: number;
  guardrailTriggered: boolean;
  fallback: boolean;
  cached: boolean;
}

export const queryRoutes: FastifyPluginAsync = async (
  app: FastifyInstance
) => {
  app.addHook('preHandler', requireAuth());
  app.addHook('preHandler', requireTenantMatch('tenantId'));

  app.post('/tenant/:tenantId/query', async (req, reply) => {
    const { tenantId } = tenantParam.parse(req.params);
    const { query } = querySchema.parse(req.body);

    if (!req.user) {
      reply
        .code(401)
        .send({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
      return;
    }

    const injectionCheck = checkPromptInjection(query);
    if (!injectionCheck.ok) {
      const response: QueryResponse = {
        answer: injectionCheck.message,
        sources: [],
        confidence: 0,
        guardrailTriggered: true,
        fallback: true,
        cached: false
      };
      reply.code(200).send(response);
      return;
    }

    const cached = await getCachedAnswer(tenantId, query);
    if (cached) {
      const response: QueryResponse = {
        ...cached,
        guardrailTriggered: false,
        cached: true
      };
      reply.code(200).send(response);
      return;
    }

    const { verdict, chunks } = await retrieve(tenantId, query);
    if (!verdict.ok) {
      const response: QueryResponse = {
        answer: verdict.message,
        sources: chunks.map((c) => ({
          documentId: c.documentId,
          filename: c.filename,
          excerpt: c.content.slice(0, 240),
          similarity: c.similarity,
          chunkIndex: c.chunkIndex
        })),
        confidence:
          chunks.length > 0
            ? chunks.reduce((a, c) => a + c.similarity, 0) / chunks.length
            : 0,
        guardrailTriggered: verdict.reason === 'low_confidence',
        fallback: true,
        cached: false
      };
      reply.code(200).send(response);
      return;
    }

    const generated = await generateAnswer(query, chunks);
    await setCachedAnswer(tenantId, query, generated);

    const avg =
      chunks.reduce((a, c) => a + c.similarity, 0) / Math.max(1, chunks.length);

    const response: QueryResponse = {
      answer: generated.answer,
      sources: generated.sources,
      confidence: avg,
      guardrailTriggered: false,
      fallback: false,
      cached: false
    };
    reply.code(200).send(response);
  });
};
