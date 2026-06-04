import pdfParse from 'pdf-parse';
import { prisma } from '../config/db';
import { chunkText } from '../rag/chunker';
import { upsertDocumentChunks, deleteDocumentPoints } from './qdrant';
import { invalidateTenantQueries } from './cache';
import { AppError } from '../middleware/errorHandler';
import type { DocumentStatus } from '@prisma/client';

export interface DocumentDTO {
  id: string;
  tenantId: string;
  filename: string;
  fileSize: number;
  chunkCount: number;
  status: DocumentStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function toDTO(
  d: {
    id: string;
    tenantId: string;
    filename: string;
    fileSize: number;
    chunkCount: number;
    status: DocumentStatus;
    metadata: unknown;
    createdAt: Date;
  }
): DocumentDTO {
  return {
    id: d.id,
    tenantId: d.tenantId,
    filename: d.filename,
    fileSize: d.fileSize,
    chunkCount: d.chunkCount,
    status: d.status,
    metadata:
      typeof d.metadata === 'object' && d.metadata !== null
        ? (d.metadata as Record<string, unknown>)
        : {},
    createdAt: d.createdAt.toISOString()
  };
}

export async function ingestPdf(
  tenantId: string,
  file: { filename: string; buffer: Buffer }
): Promise<DocumentDTO> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || !tenant.isActive) {
    throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found or inactive');
  }

  const document = await prisma.document.create({
    data: {
      tenantId,
      filename: file.filename,
      fileSize: file.buffer.byteLength,
      status: 'processing'
    }
  });

  try {
    const parsed = await pdfParse(file.buffer);
    const text = parsed.text ?? '';
    const chunks = chunkText(text, 512, 50);

    if (chunks.length === 0) {
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'failed', chunkCount: 0, metadata: { reason: 'empty_pdf' } }
      });
      throw new AppError(
        422,
        'EMPTY_DOCUMENT',
        'PDF contained no extractable text'
      );
    }

    const { upserted } = await upsertDocumentChunks({
      tenantId,
      documentId: document.id,
      filename: file.filename,
      chunks
    });

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'ready',
        chunkCount: upserted,
        metadata: { pages: parsed.numpages ?? null }
      }
    });

    await invalidateTenantQueries(tenantId);
    return toDTO(updated);
  } catch (err) {
    if (err instanceof AppError) throw err;
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'failed',
        metadata: {
          error: err instanceof Error ? err.message : 'unknown_error'
        }
      }
    });
    throw new AppError(
      500,
      'INGEST_FAILED',
      'Failed to process document',
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function listDocuments(tenantId: string): Promise<DocumentDTO[]> {
  const rows = await prisma.document.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' }
  });
  return rows.map(toDTO);
}

export async function getDocument(
  tenantId: string,
  documentId: string
): Promise<DocumentDTO> {
  const row = await prisma.document.findFirst({
    where: { id: documentId, tenantId }
  });
  if (!row) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
  }
  return toDTO(row);
}

export async function deleteDocument(
  tenantId: string,
  documentId: string
): Promise<void> {
  const row = await prisma.document.findFirst({
    where: { id: documentId, tenantId }
  });
  if (!row) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
  }
  await deleteDocumentPoints(tenantId, documentId);
  await invalidateTenantQueries(tenantId);
  await prisma.document.delete({ where: { id: documentId } });
}
