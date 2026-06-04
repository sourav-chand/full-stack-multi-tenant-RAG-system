import { Injectable, computed, signal } from '@angular/core';
import { UserRole, TenantSummary } from '../../shared/models';

interface AuthState {
  accessToken: string | null;
  tenant: TenantSummary | null;
  role: UserRole | null;
  userId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly state = signal<AuthState>({
    accessToken: null,
    tenant: null,
    role: null,
    userId: null
  });

  readonly accessToken = computed(() => this.state().accessToken);
  readonly tenant = computed(() => this.state().tenant);
  readonly role = computed(() => this.state().role);
  readonly isAuthenticated = computed(() => this.state().accessToken !== null);

  setSession(payload: {
    accessToken: string;
    tenant: TenantSummary;
    role: UserRole;
  }): void {
    this.state.set({
      accessToken: payload.accessToken,
      tenant: payload.tenant,
      role: payload.role,
      userId: `user_${payload.tenant.id}`
    });
  }

  setAccessToken(token: string): void {
    this.state.update((s) => ({ ...s, accessToken: token }));
  }

  clear(): void {
    this.state.set({
      accessToken: null,
      tenant: null,
      role: null,
      userId: null
    });
  }
}
