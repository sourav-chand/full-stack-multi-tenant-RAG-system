import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Tenant isolation middleware. The authoritative tenantId is ALWAYS the one
 * in the JWT claim. The URL parameter must match — if it doesn't, we reject.
 * The handler should rely on req.user!.tenantId for the operational tenant.
 */
export function requireTenantMatch(paramName: string = 'tenantId') {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.user) {
      return reply.code(401).send({
        error: 'Authentication required',
        code: 'UNAUTHENTICATED'
      });
    }
    const params = req.params as Record<string, string | undefined>;
    const urlTenant = params[paramName];
    if (!urlTenant) {
      return reply.code(400).send({
        error: `Missing path parameter: ${paramName}`,
        code: 'BAD_REQUEST'
      });
    }
    if (urlTenant !== req.user.tenantId && req.user.role !== 'superadmin') {
      return reply.code(403).send({
        error: 'Cross-tenant access denied',
        code: 'TENANT_MISMATCH'
      });
    }
  };
}
