import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthStore } from './core/auth/auth.store';
import { AuthApi } from './core/auth/auth.api';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  template: `
    <div class="app-shell">
      @if (auth.isAuthenticated()) {
        <mat-toolbar color="primary" class="app-toolbar">
          <span>Multi-Tenant RAG</span>
          @if (auth.tenant(); as t) {
            <span style="margin-left:12px; opacity:.8;">· {{ t.name }}</span>
          }
          <span style="flex:1 1 auto"></span>
          <a mat-button routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a mat-button routerLink="/documents" routerLinkActive="active">Documents</a>
          <a mat-button routerLink="/chat" routerLinkActive="active">Chat</a>
          <a mat-button routerLink="/tenants" routerLinkActive="active">Tenants</a>
          <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Account">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Sign out</span>
            </button>
          </mat-menu>
        </mat-toolbar>
      }
      <main class="app-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .active {
        background: rgba(255, 255, 255, 0.15);
      }
    `
  ]
})
export class AppComponent {
  protected readonly auth = inject(AuthStore);
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  logout(): void {
    this.authApi.logout().subscribe({
      next: () => {
        this.auth.clear();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.auth.clear();
        this.router.navigate(['/login']);
      }
    });
  }
}
