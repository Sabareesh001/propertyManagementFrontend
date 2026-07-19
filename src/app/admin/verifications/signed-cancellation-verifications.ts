import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { LeaseCancellationService, LeaseCancellationResponse } from '../../core/services/lease-cancellation.service';
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
type ViewMode = 'pending' | 'history';

@Component({
  selector: 'app-signed-cancellation-verifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TableModule, TagModule, ButtonModule, TooltipModule, SkeletonModule, ConfirmDialogModule, SelectButtonModule, SafeUrlPipe],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog />

    <div class="view-toggle">
      <p-selectbutton
        [options]="viewOptions"
        [(ngModel)]="mode"
        optionLabel="label"
        optionValue="value"
        (onChange)="load()"
      />
    </div>

    @if (loading()) {
      <div class="loading-state">
        <p-skeleton height="3rem" styleClass="mb-2" />
        <p-skeleton height="3rem" styleClass="mb-2" />
        <p-skeleton height="3rem" styleClass="mb-2" />
        <p-skeleton height="3rem" />
      </div>
    } @else if (error()) {
      <div class="error-state">
        <i class="pi pi-exclamation-circle error-icon"></i>
        <p class="error-msg">Failed to load signed cancellations awaiting verification.</p>
        <p-button label="Retry" icon="pi pi-refresh" severity="secondary" size="small" (onClick)="load()" />
      </div>
    } @else {
      <p-table
        [value]="requests()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 20, 50]"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} cancellations"
        styleClass="transparent-table"
        [tableStyle]="{ 'min-width': '60rem' }"
        [scrollable]="true"
        scrollHeight="flex"
      >
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 3rem">#</th>
            <th>Lease</th>
            <th>Effective / Move-Out</th>
            <th style="text-align: right">Deposit Refund</th>
            <th style="text-align: center">Documents</th>
            <th style="text-align: center">Status</th>
            <th style="text-align: center">{{ mode === 'history' ? 'Reviewed' : 'Actions' }}</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-c>
          <tr>
            <td class="row-id">{{ shortId(c.id) }}</td>
            <td>
              <a [routerLink]="['/leases', c.leaseId]" class="lease-link">
                <i class="pi pi-file-check"></i>
                View Lease
              </a>
            </td>
            <td>
              <span class="term">
                {{ formatDate(c.effectiveDate) }}
                @if (c.moveOutDate) {
                  → {{ formatDate(c.moveOutDate) }}
                }
              </span>
            </td>
            <td style="text-align: right">
              <span class="rent-amount">{{ formatCurrency(c.securityDepositRefundAmount) }}</span>
            </td>
            <td style="text-align: center">
              <div class="doc-links">
                @if (c.agreementDocumentUrl) {
                  <a [href]="c.agreementDocumentUrl | safeUrl" target="_blank" rel="noopener" class="doc-link" pTooltip="Agreement" tooltipPosition="top">
                    <i class="pi pi-file-pdf"></i>
                  </a>
                }
                @if (c.signedAgreementDocumentUrl) {
                  <a [href]="c.signedAgreementDocumentUrl | safeUrl" target="_blank" rel="noopener" class="doc-link" pTooltip="Signed agreement" tooltipPosition="top">
                    <i class="pi pi-verified"></i>
                  </a>
                }
                @if (!c.agreementDocumentUrl && !c.signedAgreementDocumentUrl) {
                  <span class="doc-missing">—</span>
                }
              </div>
            </td>
            <td style="text-align: center">
              <p-tag
                [value]="statusLabel(c.statusId)"
                [severity]="statusSeverity(c.statusId)"
                [pTooltip]="c.remarks ?? undefined"
                tooltipPosition="top"
              />
            </td>
            <td style="text-align: center">
              @if (mode === 'pending') {
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-check"
                    severity="success"
                    size="small"
                    pTooltip="Finalize Cancellation"
                    tooltipPosition="top"
                    [rounded]="true"
                    [text]="true"
                    [loading]="actioningId() === c.id && actionType() === 'approve'"
                    (onClick)="approve(c)"
                  />
                  <p-button
                    icon="pi pi-times"
                    severity="danger"
                    size="small"
                    pTooltip="Reject"
                    tooltipPosition="top"
                    [rounded]="true"
                    [text]="true"
                    [loading]="actioningId() === c.id && actionType() === 'reject'"
                    (onClick)="reject(c)"
                  />
                </div>
              } @else {
                <span class="term">{{ formatDate(c.updatedAt) }}</span>
              }
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" style="text-align: center; padding: 2rem;">
              <i class="pi pi-check-circle" style="font-size: 2rem; color: var(--p-green-500); display: block; margin-bottom: 0.5rem;"></i>
              <span style="color: var(--p-text-muted-color);">
                {{ mode === 'history' ? 'No reviewed signed cancellations yet' : 'No signed cancellations awaiting verification' }}
              </span>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    .view-toggle {
      display: flex;
      justify-content: flex-end;
      padding: 0 0 0.75rem;
      flex-shrink: 0;
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

    .lease-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--p-primary-color);
      text-decoration: none;
    }

    .lease-link:hover {
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

    .doc-missing {
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
  `],
})
export class SignedCancellationVerificationsComponent implements OnInit {
  private cancellationService = inject(LeaseCancellationService);
  private confirmationService = inject(ConfirmationService);

  mode: ViewMode = 'pending';
  viewOptions = [
    { label: 'Pending Review', value: 'pending' },
    { label: 'History', value: 'history' },
  ];

  requests = signal<LeaseCancellationResponse[]>([]);
  loading = signal(true);
  error = signal(false);
  actioningId = signal<string | null>(null);
  actionType = signal<'approve' | 'reject' | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.cancellationService.getPendingSigned(1, 100, this.mode === 'history').subscribe({
      next: (res) => {
        this.requests.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  approve(c: LeaseCancellationResponse): void {
    this.confirmationService.confirm({
      header: 'Finalize Cancellation',
      message: `Finalize this lease cancellation? The lease will be terminated and the property freed up.`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Finalize',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.actioningId.set(c.id);
        this.actionType.set('approve');
        this.cancellationService.verifySigned(c.id, true).subscribe({
          next: () => {
            this.requests.update((list) => list.filter((r) => r.id !== c.id));
            this.clearAction();
          },
          error: () => this.clearAction(),
        });
      },
    });
  }

  reject(c: LeaseCancellationResponse): void {
    this.confirmationService.confirm({
      header: 'Reject Signed Cancellation',
      message: 'Reject this signed cancellation agreement?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reject',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.actioningId.set(c.id);
        this.actionType.set('reject');
        this.cancellationService.verifySigned(c.id, false).subscribe({
          next: () => {
            this.requests.update((list) => list.filter((r) => r.id !== c.id));
            this.clearAction();
          },
          error: () => this.clearAction(),
        });
      },
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
      case 5: return 'Finalized';
      case 6: return 'Rejected';
      default: return 'Unknown';
    }
  }

  statusSeverity(statusId: number | null): Severity {
    switch (statusId) {
      case 2: return 'warn';
      case 3:
      case 4: return 'info';
      case 5: return 'success';
      case 6: return 'danger';
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
