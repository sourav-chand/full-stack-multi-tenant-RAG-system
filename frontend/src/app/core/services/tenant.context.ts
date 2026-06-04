import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

@Injectable({ providedIn: 'root' })
export class TenantContext {
  private readonly auth = inject(AuthStore);
  private readonly fallback = signal<string | null>(null);

  readonly tenantId = computed<string | null>(
    () => this.auth.tenant()?.id ?? this.fallback()
  );

  override(id: string): void {
    this.fallback.set(id);
  }

  requireId(): string {
    const id = this.tenantId();
    if (!id) {
      throw new Error('No active tenant in context');
    }
    return id;
  }
}
