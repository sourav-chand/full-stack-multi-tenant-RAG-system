export type UserRole = 'superadmin' | 'tenant_admin' | 'tenant_user';
export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
}

export interface Document {
  id: string;
  tenantId: string;
  filename: string;
  fileSize: number;
  chunkCount: number;
  status: DocumentStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface QuerySource {
  documentId: string;
  filename: string;
  excerpt: string;
  similarity: number;
  chunkIndex: number;
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
  confidence: number;
  guardrailTriggered: boolean;
  fallback: boolean;
  cached: boolean;
}

export interface LoginRequest {
  apiKey: string;
  role?: UserRole;
  email?: string;
}

export interface LoginResponse {
  accessToken: string;
  tenant: TenantSummary;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  services: {
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
    qdrant: 'up' | 'down';
  };
  timestamp: string;
}
