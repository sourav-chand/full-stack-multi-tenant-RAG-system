import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { ensureTenantCollection, deleteTenantCollection } from './qdrant';
import { invalidateTenantQueries } from './cache';
import crypto from 'node:crypto';

export interface CreateTenantInput {
  name: string;
  slug: string;
  ownerEmail?: string;
}

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
}

function generateApiKey(): string {
  return `rag_${crypto.randomBytes(24).toString('hex')}`;
}

function toDTO(t: {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
}): TenantDTO {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    apiKey: t.apiKey,
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString()
  };
}

export async function createTenant(
  input: CreateTenantInput
): Promise<TenantDTO> {
  const existingSlug = await prisma.tenant.findUnique({
    where: { slug: input.slug }
  });
  if (existingSlug) {
    throw new AppError(409, 'SLUG_TAKEN', 'Tenant slug already exists');
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      apiKey: generateApiKey(),
      isActive: true
    }
  });

  try {
    await ensureTenantCollection(tenant.id);
  } catch (err) {
    await prisma.tenant.delete({ where: { id: tenant.id } });
    throw new AppError(
      502,
      'VECTOR_STORE_INIT_FAILED',
      'Failed to initialize tenant vector collection',
      err instanceof Error ? err.message : String(err)
    );
  }

  return toDTO(tenant);
}

export async function getTenant(id: string): Promise<TenantDTO> {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }
  return toDTO(tenant);
}

export async function deleteTenant(id: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
  }
  await deleteTenantCollection(id);
  await invalidateTenantQueries(id);
  await prisma.tenant.delete({ where: { id } });
}

export async function listTenants(): Promise<TenantDTO[]> {
  const rows = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toDTO);
}

export async function findByApiKey(apiKey: string): Promise<TenantDTO | null> {
  const tenant = await prisma.tenant.findUnique({ where: { apiKey } });
  return tenant ? toDTO(tenant) : null;
}
