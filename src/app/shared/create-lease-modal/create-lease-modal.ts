import { Component, Input, Output, EventEmitter, inject, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { LeaseProposalResponse } from '../../core/services/lease-proposal.service';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';
import { PropertyService } from '../../core/services/property.service';
import { extractApiError } from '../../core/api.config';
import { AgreementDocumentModalComponent } from '../agreement-document-modal/agreement-document-modal';

@Component({
  selector: 'app-create-lease-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    DividerModule,
    MessageModule,
    AgreementDocumentModalComponent,
  ],
  templateUrl: './create-lease-modal.html',
  styleUrl: './create-lease-modal.css',
})
export class CreateLeaseModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() proposal: LeaseProposalResponse | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<LeaseResponse>();

  private leaseService = inject(LeaseService);
  private propertyService = inject(PropertyService);

  monthlyRent: number | null = null;
  upfrontPayment: number | null = null;
  securityDeposit: number | null = null;
  agreementDocumentUrl: string | null = null;

  submitting = signal(false);
  uploading = signal(false);
  errorMessage = signal<string | null>(null);
  success = signal(false);
  agreementViewerVisible = signal(false);

  ngOnChanges(): void {
    if (this.visible && this.proposal) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    const p = this.proposal;
    this.monthlyRent = p?.monthlyRent ?? null;
    this.upfrontPayment = p?.upfrontPayment ?? null;
    this.securityDeposit = p?.securityDeposit ?? null;
    this.agreementDocumentUrl = null;
    this.errorMessage.set(null);
    this.success.set(false);
    this.submitting.set(false);
    this.uploading.set(false);
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  openAgreementViewer(): void {
    this.agreementViewerVisible.set(true);
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.errorMessage.set(null);
    this.propertyService.uploadDocument(file).subscribe({
      next: ({ url }) => {
        this.agreementDocumentUrl = url;
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.errorMessage.set(extractApiError(err, 'Failed to upload the agreement document.'));
        input.value = '';
      },
    });
  }

  clearDocument(): void {
    this.agreementDocumentUrl = null;
  }

  get canSubmit(): boolean {
    return !!this.proposal?.tenantId && !!this.proposal?.propertyId && !!this.proposal?.startDate && !!this.proposal?.endDate;
  }

  close(): void {
    if (this.submitting()) return;
    this.visibleChange.emit(false);
  }

  createLease(): void {
    const p = this.proposal;
    if (!p || !p.tenantId || !p.propertyId || !p.startDate || !p.endDate) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.leaseService.create({
      tenantId: p.tenantId,
      propertyId: p.propertyId,
      proposalId: p.id,
      startDate: p.startDate,
      endDate: p.endDate,
      monthlyRent: this.monthlyRent,
      upfrontPayment: this.upfrontPayment,
      securityDeposit: this.securityDeposit,
      agreementDocumentUrl: this.agreementDocumentUrl,
    }).subscribe({
      next: (lease) => {
        this.submitting.set(false);
        this.success.set(true);
        this.created.emit(lease);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(extractApiError(err));
      },
    });
  }

  formatCurrency(value: number | null): string {
    if (value === null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
