import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TenantApi } from '../../core/services/tenant.api';
import { AuthStore } from '../../core/auth/auth.store';
import { Tenant } from '../../shared/models';

@Component({
  selector: 'app-tenants',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <h1>Tenants</h1>
    @if (isSuperAdmin()) {
      <mat-card>
        <mat-card-header>
          <mat-card-title>Create tenant</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="create()">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <mat-form-field appearance="outline" style="flex:1; min-width:200px;">
                <mat-label>Name</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:1; min-width:200px;">
                <mat-label>Slug</mat-label>
                <input matInput formControlName="slug" />
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || busy()">
                Create
              </button>
            </div>
          </form>
          @if (busy()) { <mat-progress-bar mode="indeterminate" /> }
        </mat-card-content>
      </mat-card>
    }

    <mat-card style="margin-top:16px;">
      <mat-card-content>
        <table mat-table [dataSource]="tenants()" style="width:100%;">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let t">{{ t.name }}</td>
          </ng-container>
          <ng-container matColumnDef="slug">
            <th mat-header-cell *matHeaderCellDef>Slug</th>
            <td mat-cell *matCellDef="let t">{{ t.slug }}</td>
          </ng-container>
          <ng-container matColumnDef="apiKey">
            <th mat-header-cell *matHeaderCellDef>API Key</th>
            <td mat-cell *matCellDef="let t">
              <code style="font-size:12px;">{{ t.apiKey }}</code>
            </td>
          </ng-container>
          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>Active</th>
            <td mat-cell *matCellDef="let t">{{ t.isActive }}</td>
          </ng-container>
          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Created</th>
            <td mat-cell *matCellDef="let t">{{ t.createdAt | date: 'short' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (tenants().length === 0) {
          <div class="empty-state">No tenants yet.</div>
        }
      </mat-card-content>
    </mat-card>
  `
})
export class TenantsComponent implements OnInit {
  private readonly api = inject(TenantApi);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly snack = inject(MatSnackBar);

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly busy = signal(false);
  protected readonly cols = ['name', 'slug', 'apiKey', 'active', 'created'];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]]
  });

  protected isSuperAdmin(): boolean {
    return this.auth.role() === 'superadmin';
  }

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      const res = await this.api.list().toPromise();
      this.tenants.set(res?.tenants ?? []);
    } catch {
      /* ignore */
    }
  }

  create(): void {
    if (this.form.invalid || !this.isSuperAdmin()) return;
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.api.create(v.name, v.slug).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.reset({ name: '', slug: '' });
        this.snack.open('Tenant created', 'OK', { duration: 3000 });
        void this.refresh();
      },
      error: (err: { error?: { error?: string } }) => {
        this.busy.set(false);
        this.snack.open(err?.error?.error ?? 'Create failed', 'Dismiss', {
          duration: 5000
        });
      }
    });
  }
}
