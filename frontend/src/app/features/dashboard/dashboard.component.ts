import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth/auth.store';
import { TenantContext } from '../../core/services/tenant.context';
import { Document, HealthResponse } from '../../shared/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, MatProgressBarModule, MatChipsModule],
  template: `
    <h1>Dashboard</h1>
    <p style="color:#6b7280;">
      Welcome{{ auth.tenant() ? ', ' + auth.tenant()!.name : '' }}.
    </p>
    <div class="card-grid">
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>description</mat-icon>
          <mat-card-title>Total documents</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div style="font-size:32px; font-weight:600;">
            {{ documentCount() }}
          </div>
          <div style="color:#6b7280; font-size:13px;">
            {{ readyCount() }} ready · {{ processingCount() }} processing
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>chat</mat-icon>
          <mat-card-title>Total chunks</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div style="font-size:32px; font-weight:600;">
            {{ totalChunks() }}
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>health_and_safety</mat-icon>
          <mat-card-title>System health</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (health(); as h) {
            <mat-chip-set>
              <mat-chip [color]="h.services.postgres === 'up' ? 'primary' : 'warn'">
                postgres: {{ h.services.postgres }}
              </mat-chip>
              <mat-chip [color]="h.services.redis === 'up' ? 'primary' : 'warn'">
                redis: {{ h.services.redis }}
              </mat-chip>
              <mat-chip [color]="h.services.qdrant === 'up' ? 'primary' : 'warn'">
                qdrant: {{ h.services.qdrant }}
              </mat-chip>
            </mat-chip-set>
          } @else {
            <mat-progress-bar mode="indeterminate" />
          }
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>verified_user</mat-icon>
          <mat-card-title>Session</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div><strong>Role:</strong> {{ auth.role() }}</div>
          <div style="color:#6b7280; font-size:12px;">
            Tenant: {{ tenantCtx.tenantId() }}
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  protected readonly auth = inject(AuthStore);
  protected readonly tenantCtx = inject(TenantContext);
  private readonly http = inject(HttpClient);

  protected readonly documents = signal<Document[]>([]);
  protected readonly health = signal<HealthResponse | null>(null);

  protected readonly documentCount = signal(0);
  protected readonly readyCount = signal(0);
  protected readonly processingCount = signal(0);
  protected readonly totalChunks = signal(0);

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const tid = this.tenantCtx.tenantId();
    if (tid) {
      try {
        const res = await firstValueFrom(
          this.http.get<{ documents: Document[] }>(
            `${environment.apiBase}/tenant/${tid}/documents`
          )
        );
        this.documents.set(res.documents);
        this.documentCount.set(res.documents.length);
        this.readyCount.set(
          res.documents.filter((d) => d.status === 'ready').length
        );
        this.processingCount.set(
          res.documents.filter((d) => d.status === 'processing').length
        );
        this.totalChunks.set(
          res.documents.reduce((acc, d) => acc + d.chunkCount, 0)
        );
      } catch {
        /* ignore */
      }
    }
    try {
      const h = await firstValueFrom(
        this.http.get<HealthResponse>(`${environment.apiBase}/health`)
      );
      this.health.set(h);
    } catch {
      this.health.set(null);
    }
  }
}
