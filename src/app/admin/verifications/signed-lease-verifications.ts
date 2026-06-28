import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
  selector: 'app-signed-lease-verifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    TagModule,
    ButtonModule,
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
      header="Reject Signed Lease"
      [(visible)]="rejectDialogVisible"
      [modal]="true"
      [style]="{ width: '28rem', 'max-width': '92vw' }"
      [closable]="true"
      (onHide)="cancelReject()"
    >
      <div class="reject-dialog-body">
        <p class="reject-dialog-hint">
          <i class="pi pi-info-circle"></i>
          Provide a reason for rejection. This will be visible to the lease parties.
        </p>
        <label class="remarks-label" for="rejectRemarks">Remarks <span class="required">*</span></label>
        <textarea
          pTextarea
          id="rejectRemarks"
          [(ngModel)]="rejectRemarks"
          rows="4"
          placeholder="Explain why this signed lease is being rejected..."
          [autoResize]="false"
          style="width: 100%; resize: vertical;"
        ></textarea>
        @if (remarksError()) {
          <small class="remarks-error">Remarks are required to reject a lease.</small>
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
          label="Reject Lease"
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
        <p class="error-msg">Failed to load signed leases awaiting verification.</p>
        <p-button label="Retry" icon="pi pi-refresh" severity="secondary" size="small" (onClick)="load()" />
      </div>
    } @else {
      <p-table
        [value]="requests()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 20, 50]"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} signed leases"
        styleClass="transparent-table"
        [tableStyle]="{ 'min-width': '60rem' }"
        [scrollable]="true"
        scrollHeight="flex"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 3rem">#</th>
            <th>Property</th>
            <th style="text-align: right">Rent / mo</th>
            <th style="text-align: center">Term</th>
            <th style="text-align: center">Documents</th>
            <th style="text-align: center">Status</th>
            <th style="text-align: center">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-lease>
          <tr>
            <td class="row-id">{{ shortId(lease.id) }}</td>
            <td>
              <a [routerLink]="['/property', lease.propertyId]" class="property-link">
                <i class="pi pi-home"></i>
                Property #{{ lease.propertyId }}
              </a>
            </td>
            <td style="text-align: right">
              <span class="rent-amount">{{ formatCurrency(lease.monthlyRent) }}</span>
            </td>
            <td style="text-align: center">
              <span class="term">{{ formatDate(lease.startDate) }} → {{ formatDate(lease.endDate) }}</span>
            </td>
            <td style="text-align: center">
              <div class="doc-links">
                @if (lease.agreementDocumentUrl) {
                  <a [href]="lease.agreementDocumentUrl" target="_blank" rel="noopener" class="doc-link" pTooltip="Agreement template" tooltipPosition="top">
                    <i class="pi pi-file-pdf"></i>
                  </a>
                }
                @if (lease.signedAgreementDocumentUrl) {
                  <a [href]="lease.signedAgreementDocumentUrl" target="_blank" rel="noopener" class="doc-link" pTooltip="Signed agreement" tooltipPosition="top">
                    <i class="pi pi-verified"></i>
                  </a>
                }
                @if (!lease.agreementDocumentUrl && !lease.signedAgreementDocumentUrl) {
                  <span class="doc-missing">—</span>
                }
              </div>
            </td>
            <td style="text-align: center">
              <p-tag [value]="statusLabel(lease.statusId)" [severity]="statusSeverity(lease.statusId)" />
            </td>
            <td style="text-align: center">
              <div class="action-buttons">
                <p-button
                  icon="pi pi-check"
                  severity="success"
                  size="small"
                  pTooltip="Activate Lease"
                  tooltipPosition="top"
                  [rounded]="true"
                  [text]="true"
                  [loading]="actioningId() === lease.id && actionType() === 'approve'"
                  (onClick)="approve(lease)"
                />
                <p-button
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                  pTooltip="Reject"
                  tooltipPosition="top"
                  [rounded]="true"
                  [text]="true"
                  [loading]="actioningId() === lease.id && actionType() === 'reject'"
                  (onClick)="openRejectDialog(lease)"
                />
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" style="text-align: center; padding: 2rem;">
              <i class="pi pi-check-circle" style="font-size: 2rem; color: var(--p-green-500); display: block; margin-bottom: 0.5rem;"></i>
              <span style="color: var(--p-text-muted-color);">No signed leases awaiting verification</span>
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

    .property-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--p-primary-color);
      text-decoration: none;
    }

    .property-link:hover {
      text-decoration: underline;
    }

    .rent-amount {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .term {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
    }

    .row-id {
      font-size: 0.8rem;
      color: var(--p-text-muted-color);
    }

    .doc-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      font-size: 1rem;
    }

    .doc-link {
      color: var(--p-primary-color);
      text-decoration: none;
    }

    .doc-missing,
    .no-action {
      color: var(--p-text-muted-color);
    }

    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
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
export class SignedLeaseVerificationsComponent implements OnInit {
  private leaseService = inject(LeaseService);
  private confirmationService = inject(ConfirmationService);

  requests = signal<LeaseResponse[]>([]);
  loading = signal(true);
  error = signal(false);
  actioningId = signal<string | null>(null);
  actionType = signal<'approve' | 'reject' | null>(null);

  rejectDialogVisible = false;
  rejectRemarks = '';
  remarksError = signal(false);
  private pendingReject: LeaseResponse | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.leaseService.getPendingSigned().subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  approve(lease: LeaseResponse): void {
    this.confirmationService.confirm({
      header: 'Activate Lease',
      message: `Activate the lease for <strong>Property #${lease.propertyId}</strong>? Charges can be applied once it is active.`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Activate',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.actioningId.set(lease.id);
        this.actionType.set('approve');
        this.leaseService.verifySigned(lease.id, true).subscribe({
          next: () => {
            this.requests.update((list) => list.filter((l) => l.id !== lease.id));
            this.clearAction();
          },
          error: () => this.clearAction(),
        });
      },
    });
  }

  openRejectDialog(lease: LeaseResponse): void {
    this.pendingReject = lease;
    this.rejectRemarks = '';
    this.remarksError.set(false);
    this.rejectDialogVisible = true;
  }

  cancelReject(): void {
    this.rejectDialogVisible = false;
    this.pendingReject = null;
    this.rejectRemarks = '';
    this.remarksError.set(false);
  }

  confirmReject(): void {
    if (!this.rejectRemarks.trim()) {
      this.remarksError.set(true);
      return;
    }
    const lease = this.pendingReject!;
    const remarks = this.rejectRemarks.trim();
    this.rejectDialogVisible = false;
    this.actioningId.set(lease.id);
    this.actionType.set('reject');
    this.leaseService.verifySigned(lease.id, false, remarks).subscribe({
      next: () => {
        this.requests.update((list) => list.filter((l) => l.id !== lease.id));
        this.clearAction();
        this.pendingReject = null;
        this.rejectRemarks = '';
      },
      error: () => this.clearAction(),
    });
  }

  private clearAction(): void {
    this.actioningId.set(null);
    this.actionType.set(null);
  }

  statusLabel(statusId: number | null): string {
    switch (statusId) {
      case 1: return 'Draft';
      case 2: return 'Submitted';
      case 3: return 'Pending Signature';
      case 4: return 'Tenant Signed';
      case 5: return 'Active';
      case 6: return 'Rejected';
      case 7: return 'Terminated';
      case 8: return 'Expired';
      default: return 'Unknown';
    }
  }

  statusSeverity(statusId: number | null): Severity {
    switch (statusId) {
      case 2: return 'warn';
      case 4: return 'info';
      case 5: return 'success';
      case 6:
      case 7: return 'danger';
      case 8: return 'secondary';
      default: return 'secondary';
    }
  }

  shortId(id: string): string {
    return id ? `#${id.slice(0, 8)}` : '—';
  }

  formatCurrency(value: number | null): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
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
