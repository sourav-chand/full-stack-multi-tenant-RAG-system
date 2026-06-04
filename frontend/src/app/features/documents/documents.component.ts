import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TenantApi } from '../../core/services/tenant.api';
import { TenantContext } from '../../core/services/tenant.context';
import { Document } from '../../shared/models';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Delete document?</h2>
    <mat-dialog-content>
      This will permanently remove
      <strong>{{ filename }}</strong>
      and all of its vector embeddings.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Cancel</button>
      <button mat-button color="warn" (click)="dialogRef.close(true)">
        Delete
      </button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
  filename = '';
}

@Component({
  selector: 'app-documents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule
  ],
  template: `
    <h1>Documents</h1>
    <mat-card>
      <mat-card-content>
        <div
          class="dropzone"
          [class.dragging]="dragging()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <mat-icon style="font-size:36px; height:36px; width:36px; color:#1677ff;">
            cloud_upload
          </mat-icon>
          <div style="margin-top:8px;">
            Drag &amp; drop a PDF here, or click to choose a file
          </div>
          <input
            #fileInput
            type="file"
            accept="application/pdf"
            (change)="onFileSelected($event)"
            style="display:none;"
          />
        </div>
        @if (uploading()) {
          <mat-progress-bar mode="indeterminate" style="margin-top:12px;" />
        }
      </mat-card-content>
    </mat-card>

    <mat-card style="margin-top:16px;">
      <mat-card-content>
        <table mat-table [dataSource]="documents()" class="mat-elevation-z0" style="width:100%;">
          <ng-container matColumnDef="filename">
            <th mat-header-cell *matHeaderCellDef>File</th>
            <td mat-cell *matCellDef="let row">{{ row.filename }}</td>
          </ng-container>
          <ng-container matColumnDef="size">
            <th mat-header-cell *matHeaderCellDef>Size</th>
            <td mat-cell *matCellDef="let row">{{ row.fileSize | number }} B</td>
          </ng-container>
          <ng-container matColumnDef="chunks">
            <th mat-header-cell *matHeaderCellDef>Chunks</th>
            <td mat-cell *matCellDef="let row">{{ row.chunkCount }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let row">
              <mat-chip [color]="statusColor(row.status)">
                {{ row.status }}
              </mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef>Created</th>
            <td mat-cell *matCellDef="let row">
              {{ row.createdAt | date: 'short' }}
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button (click)="confirmDelete(row)" aria-label="Delete">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (documents().length === 0) {
          <div class="empty-state">No documents yet — upload your first PDF above.</div>
        }
      </mat-card-content>
    </mat-card>
  `
})
export class DocumentsComponent implements OnInit, OnDestroy {
  private readonly api = inject(TenantApi);
  private readonly ctx = inject(TenantContext);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly documents = signal<Document[]>([]);
  protected readonly dragging = signal(false);
  protected readonly uploading = signal(false);
  protected readonly cols = [
    'filename',
    'size',
    'chunks',
    'status',
    'created',
    'actions'
  ];

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    await this.refresh();
    this.pollHandle = setInterval(() => void this.maybePoll(), 3000);
  }

  ngOnDestroy(): void {
    if (this.pollHandle !== null) clearInterval(this.pollHandle);
  }

  statusColor(status: Document['status']): 'primary' | 'accent' | 'warn' {
    if (status === 'ready') return 'primary';
    if (status === 'failed') return 'warn';
    return 'accent';
  }

  private async maybePoll(): Promise<void> {
    if (this.documents().some((d) => d.status === 'processing')) {
      await this.refresh();
    }
  }

  async refresh(): Promise<void> {
    const tid = this.ctx.tenantId();
    if (!tid) return;
    try {
      const res = await this.api.listDocuments(tid).toPromise();
      this.documents.set(res?.documents ?? []);
    } catch {
      /* ignore */
    }
  }

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.dragging.set(true);
  }
  onDragLeave(ev: DragEvent): void {
    ev.preventDefault();
    this.dragging.set(false);
  }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.dragging.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file) void this.upload(file);
  }
  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.upload(file);
    input.value = '';
  }

  private async upload(file: File): Promise<void> {
    if (file.type !== 'application/pdf') {
      this.snack.open('Only PDF files are accepted', 'OK', { duration: 3000 });
      return;
    }
    const tid = this.ctx.tenantId();
    if (!tid) return;
    this.uploading.set(true);
    try {
      await this.api.uploadDocument(tid, file).toPromise();
      this.snack.open('Upload started — processing…', 'OK', { duration: 3000 });
      await this.refresh();
    } catch (err) {
      const msg =
        (err as { error?: { error?: string } })?.error?.error ?? 'Upload failed';
      this.snack.open(msg, 'Dismiss', { duration: 5000 });
    } finally {
      this.uploading.set(false);
    }
  }

  confirmDelete(doc: Document): void {
    const ref = this.dialog.open(ConfirmDialogComponent);
    ref.componentInstance.filename = doc.filename;
    ref.afterClosed().subscribe(async (ok) => {
      if (ok) await this.delete(doc);
    });
  }

  private async delete(doc: Document): Promise<void> {
    const tid = this.ctx.tenantId();
    if (!tid) return;
    try {
      await this.api.deleteDocument(tid, doc.id).toPromise();
      this.snack.open('Document deleted', 'OK', { duration: 3000 });
      await this.refresh();
    } catch (err) {
      const msg =
        (err as { error?: { error?: string } })?.error?.error ??
        'Delete failed';
      this.snack.open(msg, 'Dismiss', { duration: 5000 });
    }
  }
}
