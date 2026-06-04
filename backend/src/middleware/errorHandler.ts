import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(
  _req: FastifyRequest,
  reply: FastifyReply
): void {
  reply.code(404).send({
    error: 'Resource not found',
    code: 'NOT_FOUND'
  });
}

export function errorHandler(
  err: FastifyError | AppError | ZodError | Error,
  req: FastifyRequest,
  reply: FastifyReply
): void {
  if (err instanceof ZodError) {
    reply.code(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({ path: i.path, message: i.message }))
    });
    return;
  }

  if (err instanceof AppError) {
    req.log.warn({ code: err.code, status: err.status }, err.message);
    reply.code(err.status).send({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {})
    });
    return;
  }

  const fastifyErr = err as FastifyError;
  const status = fastifyErr.statusCode ?? 500;
  if (status >= 500) {
    req.log.error({ err }, 'Unhandled server error');
  }
  reply.code(status).send({
    error: status >= 500 ? 'Internal server error' : fastifyErr.message,
    code: status >= 500 ? 'INTERNAL_ERROR' : (fastifyErr.code ?? 'ERROR')
  });
}
