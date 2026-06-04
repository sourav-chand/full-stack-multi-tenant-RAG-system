import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __qdrant: QdrantClient | undefined;
}

export const qdrant: QdrantClient =
  globalThis.__qdrant ??
  new QdrantClient({
    url: env().QDRANT_URL,
    timeout: 30_000
  });

if (env().NODE_ENV !== 'production') {
  globalThis.__qdrant = qdrant;
}

export function tenantCollectionName(tenantId: string): string {
  return `tenant_${tenantId}`;
}

export async function pingQdrant(): Promise<boolean> {
  try {
    const res = await qdrant.getCollections();
    return Array.isArray(res.collections);
  } catch {
    return false;
  }
}
