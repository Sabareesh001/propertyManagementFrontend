import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { forkJoin, of, map, catchError, switchMap } from 'rxjs';
import {
  UserVerificationService,
  UserVerificationResponse,
  verificationDocumentTypeName,
} from '../../core/services/user-verification.service';
import { AuthService } from '../../core/services/auth.service';

interface PendingRow extends UserVerificationResponse {
  userName: string;
  userEmail: string;
}

@Component({
  selector: 'app-user-verifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    AvatarModule,
    TooltipModule,
    SkeletonModule,
    DialogModule,
    TextareaModule,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog />

    <!-- Reject dialog with remarks -->
    <p-dialog
      header="Reject Verification"
      [(visible)]="rejectDialogVisible"
      [modal]="true"
      [style]="{ width: '28rem', 'max-width': '92vw' }"
      [closable]="true"
      (onHide)="cancelReject()"
    >
      <div class="reject-dialog-body">
        <p class="reject-dialog-hint">
          <i class="pi pi-info-circle"></i>
          Provide a reason for rejection. This will be visible to the user so they can resubmit.
        </p>
        <label class="remarks-label" for="rejectRemarks">Remarks <span class="required">*</span></label>
        <textarea
          pTextarea
          id="rejectRemarks"
          [(ngModel)]="rejectRemarks"
          rows="4"
          maxlength="500"
          placeholder="Explain why this verification is being rejected..."
          [autoResize]="false"
          style="width: 100%; resize: vertical;"
        ></textarea>
        @if (remarksError()) {
          <small class="remarks-error">Remarks are required to reject a verification.</small>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          size="small"
          (onClick)="cancelReject()"
        />
        <p-button
          label="Reject Verification"
          icon="pi pi-times"
          severity="danger"
          size="small"
          [loading]="actioningId() !== null && actionType() === 'reject'"
          (onClick)="confirmReject()"
        />
      </ng-template>
    </p-dialog>

    @if (loading()) {
      <div class="loading-state">
        <p-skeleton height="3rem" styleClass="mb-2" />
        <p-skeleton height="3rem" styleClass="mb-2" />
        <p-skeleton height="3rem" styleClass="mb-2" />
        <p-skeleton height="3rem" styleClass="mb-2" />
        <p-skeleton height="3rem" />
      </div>
    } @else if (error()) {
      <div class="error-state">
        <i class="pi pi-exclamation-circle error-icon"></i>
        <p class="error-msg">Failed to load verification requests.</p>
        <p-button label="Retry" icon="pi pi-refresh" severity="secondary" size="small" (onClick)="load()" />
      </div>
    } @else {
      <p-table
        [value]="requests()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 20, 50]"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} requests"
        styleClass="transparent-table"
        [tableStyle]="{ 'min-width': '55rem' }"
        [scrollable]="true"
        scrollHeight="flex"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>User</th>
            <th>Documents</th>
            <th style="text-align: center">Submitted</th>
            <th style="text-align: center">Status</th>
            <th style="text-align: center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-req>
          <tr>
            <td>
              <div class="user-cell">
                <p-avatar
                  [label]="req.userName.charAt(0)"
                  shape="circle"
                  size="normal"
                  styleClass="user-avatar"
                />
                <div class="user-info">
                  <span class="user-name">{{ req.userName }}</span>
                  <span class="user-email">{{ req.userEmail }}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="document-list">
                @for (doc of req.documents; track doc.id) {
                  <a
                    class="document-link"
                    [href]="doc.documentUrl"
                    target="_blank"
                    rel="noopener"
                    [pTooltip]="'No. ' + doc.documentNumber"
                    tooltipPosition="top"
                  >
                    <i class="pi pi-file-pdf"></i>
                    {{ documentTypeName(doc.documentTypeId) }}
                  </a>
                }
              </div>
            </td>
            <td style="text-align: center">
              <span class="submitted-date">{{ formatDate(req.createdAt) }}</span>
            </td>
            <td style="text-align: center">
              <p-tag value="Pending Review" severity="warn" icon="pi pi-clock" />
            </td>
            <td style="text-align: center">
              <div class="action-buttons">
                <p-button
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  pTooltip="Approve"
                  tooltipPosition="top"
                  [rounded]="true"
                  [text]="true"
                  [loading]="actioningId() === req.id && actionType() === 'approve'"
                  (onClick)="approve(req)"
                />
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                  pTooltip="Reject"
                  tooltipPosition="top"
                  [rounded]="true"
                  [text]="true"
                  [loading]="actioningId() === req.id && actionType() === 'reject'"
                  (onClick)="openRejectDialog(req.id)"
                />
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem;">
              <i class="pi pi-check-circle" style="font-size: 2rem; color: var(--p-green-500); display: block; margin-bottom: 0.5rem;"></i>
              <span style="color: var(--p-text-muted-color);">No pending verification requests</span>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    :host ::ng-deep .transparent-table {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 0;
    }

    :host ::ng-deep .transparent-table .p-datatable-table-container,
    :host ::ng-deep .transparent-table .p-datatable-header,
    :host ::ng-deep .transparent-table .p-datatable-footer,
    :host ::ng-deep .transparent-table .p-paginator {
      background: transparent;
    }

    :host ::ng-deep .transparent-table .p-paginator {
      border-top: 1px solid var(--p-content-border-color);
      flex-shrink: 0;
    }

    :host ::ng-deep .transparent-table .p-datatable-thead > tr > th {
      background: transparent;
      border-bottom: 1px solid var(--p-content-border-color);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--p-text-muted-color);
    }

    :host ::ng-deep .transparent-table .p-datatable-tbody > tr {
      background: transparent;
    }

    :host ::ng-deep .transparent-table .p-datatable-tbody > tr > td {
      border-bottom: 1px solid var(--p-content-border-color);
    }

    :host ::ng-deep .transparent-table .p-datatable-tbody > tr:hover > td {
      background: var(--p-content-hover-background);
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .user-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .user-email {
      font-size: 0.8rem;
      color: var(--p-text-muted-color);
      overflow-wrap: break-word;
    }

    .document-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.75rem;
    }

    .document-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: var(--p-primary-color);
      text-decoration: none;
    }

    .document-link:hover {
      text-decoration: underline;
    }

    .document-link i {
      color: var(--p-red-500);
    }

    .submitted-date {
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
    }

    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }

    :host ::ng-deep .user-avatar {
      background-color: var(--p-primary-100);
      color: var(--p-primary-color);
      font-weight: 600;
    }

    .loading-state {
      flex: 1;
      padding: 1.5rem;
    }

    .error-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      text-align: center;
    }

    .error-icon {
      font-size: 2.5rem;
      color: var(--p-red-500);
    }

    .error-msg {
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
      margin: 0;
    }

    .reject-dialog-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.25rem 0;
    }

    .reject-dialog-hint {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
      margin: 0;
      line-height: 1.5;
    }

    .remarks-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .required {
      color: var(--p-red-500);
    }

    .remarks-error {
      font-size: 0.75rem;
      color: var(--p-red-500);
    }
  `],
})
export class UserVerificationsComponent implements OnInit {
  private verificationService = inject(UserVerificationService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);

  requests = signal<PendingRow[]>([]);
  loading = signal(true);
  error = signal(false);
  actioningId = signal<string | null>(null);
  actionType = signal<'approve' | 'reject' | null>(null);

  rejectDialogVisible = false;
  rejectRemarks = '';
  remarksError = signal(false);
  private pendingRejectId: string | null = null;

  documentTypeName = verificationDocumentTypeName;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.verificationService
      .getPending(1, 100)
      .pipe(
        switchMap((res) => {
          const pending = res.items;
          if (!pending.length) return of([] as PendingRow[]);
          return forkJoin(
            pending.map((req) =>
              this.authService.getUserById(req.userId).pipe(
                map((user) => ({
                  ...req,
                  userName: `${user.firstName} ${user.lastName}`.trim(),
                  userEmail: user.email,
                })),
                catchError(() => of({ ...req, userName: 'Unknown user', userEmail: '—' })),
              ),
            ),
          );
        }),
      )
      .subscribe({
        next: (rows) => {
          this.requests.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  approve(req: PendingRow): void {
    this.confirmationService.confirm({
      header: 'Approve Verification',
      message: `Are you sure you want to verify <strong>${req.userName}</strong>? They will be able to list properties and submit lease proposals.`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Approve',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.actioningId.set(req.id);
        this.actionType.set('approve');
        this.verificationService.verify(req.id).subscribe({
          next: () => {
            this.requests.update((list) => list.filter((r) => r.id !== req.id));
            this.actioningId.set(null);
            this.actionType.set(null);
          },
          error: () => {
            this.actioningId.set(null);
            this.actionType.set(null);
          },
        });
      },
    });
  }

  openRejectDialog(id: string): void {
    this.pendingRejectId = id;
    this.rejectRemarks = '';
    this.remarksError.set(false);
    this.rejectDialogVisible = true;
  }

  cancelReject(): void {
    this.rejectDialogVisible = false;
    this.pendingRejectId = null;
    this.rejectRemarks = '';
    this.remarksError.set(false);
  }

  confirmReject(): void {
    if (!this.rejectRemarks.trim()) {
      this.remarksError.set(true);
      return;
    }
    const id = this.pendingRejectId!;
    this.rejectDialogVisible = false;
    this.actioningId.set(id);
    this.actionType.set('reject');
    this.verificationService.reject(id, this.rejectRemarks.trim()).subscribe({
      next: () => {
        this.requests.update((list) => list.filter((r) => r.id !== id));
        this.actioningId.set(null);
        this.actionType.set(null);
        this.pendingRejectId = null;
        this.rejectRemarks = '';
      },
      error: () => {
        this.actioningId.set(null);
        this.actionType.set(null);
      },
    });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  }
}
