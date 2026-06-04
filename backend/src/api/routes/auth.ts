import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { findByApiKey } from '../../services/tenant';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  type UserRole
} from '../../middleware/auth';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

const loginSchema = z.object({
  apiKey: z.string().min(8),
  role: z.enum(['tenant_admin', 'tenant_user']).default('tenant_user'),
  email: z.string().email().optional()
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional()
});

export const authRoutes: FastifyPluginAsync = async (
  app: FastifyInstance
) => {
  app.post('/auth/login', async (req, reply) => {
    const { apiKey, role, email } = loginSchema.parse(req.body);
    const tenant = await findByApiKey(apiKey);
    if (!tenant || !tenant.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid API key');
    }
    const userId = `user_${tenant.id}`;
    const claims = {
      sub: userId,
      tenantId: tenant.id,
      role: role as UserRole,
      email
    };
    const access = signAccessToken(claims);
    const refresh = signRefreshToken(claims);
    reply.setCookie('refresh_token', refresh, {
      httpOnly: true,
      secure: env().NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: env().JWT_REFRESH_TTL
    });
    return {
      accessToken: access,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
    };
  });

  app.post('/auth/refresh', async (req, reply) => {
    const body = refreshSchema.parse(req.body ?? {});
    const cookieToken = req.cookies['refresh_token'];
    const token = body.refreshToken ?? cookieToken;
    if (!token) {
      throw new AppError(401, 'NO_REFRESH_TOKEN', 'Refresh token required');
    }
    let claims;
    try {
      claims = verifyToken(token);
    } catch {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }
    const newAccess = signAccessToken({
      sub: claims.sub,
      tenantId: claims.tenantId,
      role: claims.role,
      email: claims.email
    });
    return { accessToken: newAccess };
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie('refresh_token', { path: '/auth' });
    return { ok: true };
  });
};
