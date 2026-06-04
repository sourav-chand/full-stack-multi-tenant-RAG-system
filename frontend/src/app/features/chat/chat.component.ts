import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { TenantApi } from '../../core/services/tenant.api';
import { TenantContext } from '../../core/services/tenant.context';
import { QueryResponse } from '../../shared/models';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: QueryResponse;
  pending?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatChipsModule
  ],
  template: `
    <h1>Chat</h1>
    <mat-card>
      <mat-card-content>
        <div class="chat-stack" style="min-height: 320px; max-height: 60vh; overflow-y: auto;">
          @if (messages().length === 0) {
            <div class="empty-state">
              Ask a question about your uploaded documents. The assistant can
              only answer using your tenant's content.
            </div>
          }
          @for (m of messages(); track m.id) {
            <div class="chat-bubble" [class.user]="m.role === 'user'" [class.assistant]="m.role === 'assistant'">
              <div>{{ m.content }}</div>
              @if (m.response?.guardrailTriggered) {
                <div class="guardrail-banner">
                  <mat-icon style="font-size:16px; height:16px; width:16px;">warning</mat-icon>
                  Guardrail triggered — low confidence answer.
                </div>
              }
              @if (m.response && m.response.sources.length > 0) {
                <mat-accordion style="margin-top:8px;">
                  @for (s of m.response.sources; track s.documentId + ':' + s.chunkIndex) {
                    <mat-expansion-panel>
                      <mat-expansion-panel-header>
                        <mat-panel-title>
                          {{ s.filename }}
                        </mat-panel-title>
                        <mat-panel-description>
                          similarity {{ s.similarity.toFixed(3) }}
                        </mat-panel-description>
                      </mat-expansion-panel-header>
                      <div class="source-card">
                        <div class="meta">
                          <span>chunk #{{ s.chunkIndex }}</span>
                          <span>{{ (s.similarity * 100).toFixed(1) }}%</span>
                        </div>
                        <div>{{ s.excerpt }}</div>
                      </div>
                    </mat-expansion-panel>
                  }
                </mat-accordion>
              }
              @if (m.response) {
                <div style="font-size:11px; color:#9ca3af; margin-top:6px;">
                  confidence {{ (m.response.confidence * 100).toFixed(0) }}%
                  @if (m.response.cached) { · cached }
                </div>
              }
              @if (m.pending) {
                <mat-progress-bar mode="indeterminate" style="margin-top:8px;" />
              }
            </div>
          }
        </div>

        <form
          (submit)="send($event)"
          style="display:flex; gap:8px; margin-top:16px; align-items:flex-end;"
        >
          <mat-form-field appearance="outline" style="flex:1;">
            <mat-label>Ask a question</mat-label>
            <input matInput [(ngModel)]="input" name="query" autocomplete="off" />
          </mat-form-field>
          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="!input.trim() || busy()"
          >
            <mat-icon>send</mat-icon>
            Send
          </button>
        </form>
      </mat-card-content>
    </mat-card>
  `
})
export class ChatComponent {
  private readonly api = inject(TenantApi);
  private readonly ctx = inject(TenantContext);

  protected readonly messages = signal<Message[]>([]);
  protected readonly input = '';
  protected readonly busy = signal(false);

  send(ev: Event): void {
    ev.preventDefault();
    const text = this.input.trim();
    if (!text || this.busy()) return;
    this.input = '';
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text
    };
    const pendingId = crypto.randomUUID();
    const pending: Message = {
      id: pendingId,
      role: 'assistant',
      content: 'Thinking…',
      pending: true
    };
    this.messages.update((arr) => [...arr, userMsg, pending]);
    this.busy.set(true);
    const tid = this.ctx.tenantId();
    if (!tid) {
      this.replacePending(pendingId, {
        id: pendingId,
        role: 'assistant',
        content: 'No active tenant.'
      });
      this.busy.set(false);
      return;
    }
    this.api.query(tid, text).subscribe({
      next: (res) => {
        this.replacePending(pendingId, {
          id: pendingId,
          role: 'assistant',
          content: res.answer,
          response: res
        });
      },
      error: (err: { error?: { error?: string } }) => {
        this.replacePending(pendingId, {
          id: pendingId,
          role: 'assistant',
          content: err?.error?.error ?? 'Query failed.'
        });
      },
      complete: () => this.busy.set(false)
    });
  }

  private replacePending(id: string, replacement: Message): void {
    this.messages.update((arr) => arr.map((m) => (m.id === id ? replacement : m)));
  }
}
