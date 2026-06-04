import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type UserRole = 'superadmin' | 'tenant_admin' | 'tenant_user';

export interface JwtClaims {
  sub: string;
  tenantId: string;
  role: UserRole;
  email?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtClaims;
  }
}

export function signAccessToken(claims: JwtClaims): string {
  return jwt.sign(claims, env().JWT_SECRET, {
    expiresIn: env().JWT_ACCESS_TTL
  });
}

export function signRefreshToken(claims: JwtClaims): string {
  return jwt.sign({ ...claims, kind: 'refresh' }, env().JWT_SECRET, {
    expiresIn: env().JWT_REFRESH_TTL
  });
}

export function verifyToken(token: string): JwtClaims {
  const decoded = jwt.verify(token, env().JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  const payload = decoded as Record<string, unknown>;
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.tenantId !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    throw new Error('Malformed token payload');
  }
  return {
    sub: payload.sub,
    tenantId: payload.tenantId,
    role: payload.role as UserRole,
    email: typeof payload.email === 'string' ? payload.email : undefined
  };
}

export function extractBearer(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string') return null;
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export function requireAuth() {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const token = extractBearer(req);
    if (!token) {
      return reply.code(401).send({
        error: 'Missing or invalid Authorization header',
        code: 'UNAUTHENTICATED'
      });
    }
    try {
      req.user = verifyToken(token);
    } catch {
      return reply.code(401).send({
        error: 'Invalid or expired token',
        code: 'UNAUTHENTICATED'
      });
    }
  };
}

export function requireRole(...roles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.user) {
      return reply.code(401).send({
        error: 'Authentication required',
        code: 'UNAUTHENTICATED'
      });
    }
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({
        error: `Requires role: ${roles.join(' | ')}`,
        code: 'FORBIDDEN'
      });
    }
  };
}
