import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tenant, Document, QueryResponse } from '../../shared/models';
import { AuthStore } from '../auth/auth.store';

@Injectable({ providedIn: 'root' })
export class TenantApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthStore);
  private readonly base = environment.apiBase;

  create(name: string, slug: string): Observable<Tenant> {
    return this.http.post<Tenant>(`${this.base}/tenant`, { name, slug });
  }

  list(): Observable<{ tenants: Tenant[] }> {
    return this.http.get<{ tenants: Tenant[] }>(`${this.base}/tenant`);
  }

  get(id: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.base}/tenant/${id}`);
  }

  delete(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/tenant/${id}`);
  }

  listDocuments(tenantId: string): Observable<{ documents: Document[] }> {
    return this.http.get<{ documents: Document[] }>(
      `${this.base}/tenant/${tenantId}/documents`
    );
  }

  uploadDocument(tenantId: string, file: File): Observable<Document> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<Document>(
      `${this.base}/tenant/${tenantId}/documents`,
      fd
    );
  }

  deleteDocument(tenantId: string, documentId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(
      `${this.base}/tenant/${tenantId}/documents/${documentId}`
    );
  }

  query(tenantId: string, query: string): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(
      `${this.base}/tenant/${tenantId}/query`,
      { query }
    );
  }
}
