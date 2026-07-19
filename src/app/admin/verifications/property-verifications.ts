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
import { SelectButtonModule } from 'primeng/selectbutton';
import { ConfirmationService } from 'primeng/api';
import { PropertyDetailComponent } from '../../property-detail/property-detail';
import { PropertyService, PropertyDetail } from '../../core/services/property.service';

type ViewMode = 'pending' | 'history';
type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
  selector: 'app-property-verifications',
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
    SelectButtonModule,
    PropertyDetailComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog />

    <!-- Reject dialog with remarks -->
    <p-dialog
      header="Reject Property"
      [(visible)]="rejectDialogVisible"
      [modal]="true"
      [style]="{ width: '28rem', 'max-width': '92vw' }"
      [closable]="true"
      (onHide)="cancelReject()"
    >
      <div class="reject-dialog-body">
        <p class="reject-dialog-hint">
          <i class="pi pi-info-circle"></i>
          Provide a reason for rejection. This will be visible to the property owner.
        </p>
        <label class="remarks-label" for="rejectRemarks">Remarks <span class="required">*</span></label>
        <textarea
          pTextarea
          id="rejectRemarks"
          [(ngModel)]="rejectRemarks"
          rows="4"
          placeholder="Explain why this property is being rejected..."
          [autoResize]="false"
          style="width: 100%; resize: vertical;"
        ></textarea>
        @if (remarksError()) {
          <small class="remarks-error">Remarks are required to reject a property.</small>
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
          label="Reject Property"
          icon="pi pi-times"
          severity="danger"
          size="small"
          [loading]="actioningId() !== null && actionType() === 'reject'"
          (onClick)="confirmReject()"
        />
      </ng-template>
    </p-dialog>

    @if (selectedPropertyId() !== null) {
      <div class="detail-view">
        <div class="detail-back">
          <p-button
            icon="pi pi-arrow-left"
            label="Back to Requests"
            severity="secondary"
            [text]="true"
            size="small"
            (onClick)="closePropertyDetail()"
          />
        </div>
        <app-property-detail
          [propertyId]="selectedPropertyId()!"
          [embedded]="true"
          [showDeedButton]="true"
        />
      </div>
    } @else {
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
              <th style="width: 3rem">#</th>
              <th>Property</th>
              <th>Address</th>
              <th style="text-align: right">Rent / mo</th>
              <th style="text-align: center">Listed</th>
              <th style="text-align: center">Status</th>
              <th style="text-align: center">{{ mode === 'history' ? 'Reviewed' : 'Actions' }}</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-req>
            <tr>
              <td class="row-id">{{ req.id }}</td>
              <td>
                <div class="property-cell">
                  <p-avatar
                    [label]="req.title.charAt(0)"
                    shape="circle"
                    size="normal"
                    styleClass="property-avatar"
                  />
                  <span class="property-title">{{ req.title }}</span>
                </div>
              </td>
              <td>
                <span class="address">{{ req.addressLine }}</span>
              </td>
              <td style="text-align: right">
                <span class="rent-amount">{{ formatCurrency(req.monthlyRent) }}</span>
              </td>
              <td style="text-align: center">
                <span class="submitted-date">{{ formatDate(req.createdAt) }}</span>
              </td>
              <td style="text-align: center">
                @if (mode === 'history') {
                  <p-tag
                    [value]="statusLabel(req.verificationStatusId)"
                    [severity]="statusSeverity(req.verificationStatusId)"
                    [pTooltip]="req.remarks ?? undefined"
                    tooltipPosition="top"
                  />
                } @else {
                  <p-tag value="Pending Review" severity="warn" icon="pi pi-clock" />
                }
              </td>
              <td style="text-align: center">
                <div class="action-buttons">
                  @if (mode === 'pending') {
                    <p-button
                      icon="pi pi-check"
                      severity="success"
                      size="small"
                      pTooltip="Approve"
                      tooltipPosition="top"
                      [rounded]="true"
                      [text]="true"
                      [loading]="actioningId() === req.id && actionType() === 'approve'"
                      (onClick)="approve(req.id, req.title)"
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
                      (onClick)="openRejectDialog(req.id, req.title)"
                    />
                  }
                  <p-button
                    icon="pi pi-eye"
                    severity="info"
                    size="small"
                    pTooltip="View Details"
                    tooltipPosition="top"
                    [rounded]="true"
                    [text]="true"
                    (onClick)="openPropertyDetail(req.id)"
                  />
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" style="text-align: center; padding: 2rem;">
                <i class="pi pi-check-circle" style="font-size: 2rem; color: var(--p-green-500); display: block; margin-bottom: 0.5rem;"></i>
                <span style="color: var(--p-text-muted-color);">
                  {{ mode === 'history' ? 'No reviewed properties yet' : 'No pending approval requests' }}
                </span>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
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

    .property-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .property-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .address {
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
    }

    .rent-amount {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .submitted-date {
      font-size: 0.875rem;
      color: var(--p-text-muted-color);
    }

    .row-id {
      font-size: 0.8rem;
      color: var(--p-text-muted-color);
    }

    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }

    :host ::ng-deep .property-avatar {
      background-color: var(--p-primary-100);
      color: var(--p-primary-color);
      font-weight: 600;
    }

    .detail-view {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .detail-back {
      padding: 0.75rem 1.25rem 0;
      flex-shrink: 0;
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
export class PropertyVerificationsComponent implements OnInit {
  private propertyService = inject(PropertyService);
  private confirmationService = inject(ConfirmationService);

  mode: ViewMode = 'pending';
  viewOptions = [
    { label: 'Pending Review', value: 'pending' },
    { label: 'History', value: 'history' },
  ];

  requests = signal<PropertyDetail[]>([]);
  loading = signal(true);
  error = signal(false);
  selectedPropertyId = signal<number | null>(null);
  actioningId = signal<number | null>(null);
  actionType = signal<'approve' | 'reject' | null>(null);

  rejectDialogVisible = false;
  rejectRemarks = '';
  remarksError = signal(false);
  private pendingRejectId: number | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    // Table already paginates client-side over the loaded set, so pull a large page (backend caps at 100).
    this.propertyService.getPendingVerification(1, 100, this.mode === 'history').subscribe({
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

  approve(id: number, title: string): void {
    this.confirmationService.confirm({
      header: 'Approve Property',
      message: `Are you sure you want to approve <strong>${title}</strong>? It will be listed as verified and available to tenants.`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Approve',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.actioningId.set(id);
        this.actionType.set('approve');
        this.propertyService.verifyProperty(id, true).subscribe({
          next: () => {
            this.requests.update((list) => list.filter((p) => p.id !== id));
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

  openRejectDialog(id: number, _title: string): void {
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
    this.propertyService.verifyProperty(id, false, this.rejectRemarks.trim()).subscribe({
      next: () => {
        this.requests.update((list) => list.filter((p) => p.id !== id));
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

  openPropertyDetail(id: number): void {
    this.selectedPropertyId.set(id);
  }

  closePropertyDetail(): void {
    this.selectedPropertyId.set(null);
  }

  formatCurrency(value: number): string {
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

  statusLabel(verificationStatusId: number | null): string {
    switch (verificationStatusId) {
      case 1: return 'Draft';
      case 2: return 'Submitted';
      case 3: return 'Verified';
      case 4: return 'Rejected';
      default: return 'Unknown';
    }
  }

  statusSeverity(verificationStatusId: number | null): Severity {
    switch (verificationStatusId) {
      case 3: return 'success';
      case 4: return 'danger';
      case 2: return 'warn';
      default: return 'secondary';
    }
  }
}
