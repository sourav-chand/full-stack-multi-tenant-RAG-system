import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthApi } from '../../core/auth/auth.api';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <div style="display:flex; justify-content:center; padding:48px 16px;">
      <mat-card style="width:100%; max-width:420px;">
        <mat-card-title>Sign in</mat-card-title>
        <mat-card-subtitle>Use your tenant API key</mat-card-subtitle>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" style="width:100%;">
              <mat-label>API Key</mat-label>
              <input matInput type="password" formControlName="apiKey" autocomplete="off" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:100%;">
              <mat-label>Role</mat-label>
              <mat-select formControlName="role">
                <mat-option value="tenant_admin">Tenant admin</mat-option>
                <mat-option value="tenant_user">Tenant user</mat-option>
              </mat-select>
            </mat-form-field>
            @if (error(); as e) {
              <div style="color:#d4380d; font-size:13px; margin-bottom:8px;">
                {{ e }}
              </div>
            }
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || loading()"
              style="width:100%;"
            >
              @if (loading()) {
                <mat-progress-spinner mode="indeterminate" diameter="20" />
              } @else {
                <span>Sign in</span>
              }
            </button>
          </form>
        </mat-card-content>
        <mat-card-footer>
          <div style="padding:12px 16px; font-size:12px; color:#6b7280;">
            <mat-icon style="font-size:14px; height:14px; width:14px;">info</mat-icon>
            Get your API key from the tenant admin or via
            <code>POST /api/tenant</code>.
          </div>
        </mat-card-footer>
      </mat-card>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    apiKey: ['', [Validators.required, Validators.minLength(8)]],
    role: ['tenant_user' as 'tenant_admin' | 'tenant_user']
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    this.authApi.login(value).subscribe({
      next: (res) => {
        this.auth.setSession({
          accessToken: res.accessToken,
          tenant: res.tenant,
          role: value.role
        });
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: { error?: { error?: string } }) => {
        this.error.set(err?.error?.error ?? 'Login failed');
        this.loading.set(false);
      }
    });
  }
}
