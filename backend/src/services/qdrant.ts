import { qdrant, tenantCollectionName } from '../config/qdrant';
import { env } from '../config/env';
import { embedTexts } from '../rag/embedder';
import type { Chunk } from '../rag/chunker';

export interface UpsertInput {
  tenantId: string;
  documentId: string;
  filename: string;
  chunks: Chunk[];
}

export interface UpsertSummary {
  upserted: number;
}

interface QdrantPointPayload {
  tenant_id: string;
  document_id: string;
  filename: string;
  chunk_index: number;
  content: string;
  created_at: string;
}

export async function ensureTenantCollection(tenantId: string): Promise<void> {
  const name = tenantCollectionName(tenantId);
  const existing = await qdrant.getCollections();
  if (existing.collections.some((c) => c.name === name)) return;
  await qdrant.createCollection(name, {
    vectors: {
      size: env().EMBED_DIM,
      distance: 'Cosine'
    }
  });
}

export async function deleteTenantCollection(tenantId: string): Promise<void> {
  const name = tenantCollectionName(tenantId);
  try {
    await qdrant.deleteCollection(name);
  } catch {
    /* collection may not exist — that's fine */
  }
}

export async function upsertDocumentChunks(
  input: UpsertInput
): Promise<UpsertSummary> {
  if (input.chunks.length === 0) return { upserted: 0 };

  await ensureTenantCollection(input.tenantId);

  const vectors = await embedTexts(input.chunks.map((c) => c.content));
  const createdAt = new Date().toISOString();

  const points = input.chunks.map((chunk, i) => {
    const vector = vectors[i];
    if (!vector) {
      throw new Error(`Missing embedding for chunk ${chunk.index}`);
    }
    const payload: QdrantPointPayload = {
      tenant_id: input.tenantId,
      document_id: input.documentId,
      filename: input.filename,
      chunk_index: chunk.index,
      content: chunk.content,
      created_at: createdAt
    };
    return {
      id: deterministicPointId(input.documentId, chunk.index),
      vector,
      payload
    };
  });

  await qdrant.upsert(tenantCollectionName(input.tenantId), { points });
  return { upserted: points.length };
}

export async function deleteDocumentPoints(
  tenantId: string,
  documentId: string
): Promise<void> {
  await qdrant.delete(tenantCollectionName(tenantId), {
    filter: {
      must: [
        {
          key: 'document_id',
          match: { value: documentId }
        }
      ]
    }
  });
}

function deterministicPointId(documentId: string, chunkIndex: number): string {
  const raw = `${documentId}:${chunkIndex}`;
  let h1 = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) {
    h1 ^= raw.charCodeAt(i);
    h1 = (h1 * 0x01000193) >>> 0;
  }
  const hi = h1.toString(16).padStart(8, '0');
  return `${hi}${chunkIndex.toString(16).padStart(4, '0')}`;
}
