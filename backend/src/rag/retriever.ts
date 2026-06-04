import { qdrant, tenantCollectionName } from '../config/qdrant';
import { embedQuery } from './embedder';
import { checkConfidence, type GuardrailVerdict } from './guardrails';
import { env } from '../config/env';

export interface RetrievedChunk {
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  createdAt: string;
}

export interface RetrievalResult {
  verdict: GuardrailVerdict;
  chunks: RetrievedChunk[];
}

const SEARCH_LIMIT = 5;
const SCORE_THRESHOLD = 0.35;
const MIN_RESULTS = 2;
const MIN_AVERAGE = 0.4;
const MIN_TOP = SCORE_THRESHOLD;

interface QdrantPointPayload {
  tenant_id: string;
  document_id: string;
  filename: string;
  chunk_index: number;
  content: string;
  created_at: string;
}

function isPayload(value: unknown): value is QdrantPointPayload {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.tenant_id === 'string' &&
    typeof p.document_id === 'string' &&
    typeof p.filename === 'string' &&
    typeof p.chunk_index === 'number' &&
    typeof p.content === 'string' &&
    typeof p.created_at === 'string'
  );
}

export async function retrieve(
  tenantId: string,
  query: string
): Promise<RetrievalResult> {
  const collection = tenantCollectionName(tenantId);
  const vector = await embedQuery(query);

  const raw = await qdrant.search(collection, {
    vector,
    limit: SEARCH_LIMIT,
    score_threshold: SCORE_THRESHOLD,
    with_payload: true
  });

  const chunks: RetrievedChunk[] = [];
  for (const hit of raw) {
    if (!isPayload(hit.payload)) continue;
    if (hit.payload.tenant_id !== tenantId) continue;
    chunks.push({
      documentId: hit.payload.document_id,
      filename: hit.payload.filename,
      chunkIndex: hit.payload.chunk_index,
      content: hit.payload.content,
      similarity: hit.score,
      createdAt: hit.payload.created_at
    });
  }

  if (chunks.length === 0) {
    return {
      verdict: {
        ok: false,
        reason: 'out_of_scope',
        message: "I can only answer questions based on your organization's documents."
      },
      chunks: []
    };
  }

  const topScore = chunks[0]?.similarity ?? 0;
  const averageScore =
    chunks.reduce((acc, c) => acc + c.similarity, 0) / chunks.length;

  const verdict = checkConfidence(
    { resultCount: chunks.length, topScore, averageScore },
    { minResults: MIN_RESULTS, minAverage: MIN_AVERAGE, minTop: MIN_TOP }
  );

  return { verdict, chunks };
}

export const retrieverConstants = {
  SEARCH_LIMIT,
  SCORE_THRESHOLD,
  MIN_RESULTS,
  MIN_AVERAGE,
  EMBED_DIM: env().EMBED_DIM
};
