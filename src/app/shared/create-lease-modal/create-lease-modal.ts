import { Component, Input, Output, EventEmitter, inject, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { LeaseProposalResponse } from '../../core/services/lease-proposal.service';
import { LeaseService } from '../../core/services/lease.service';
import { PropertyService } from '../../core/services/property.service';
import { extractApiError } from '../../core/api.config';

@Component({
  selector: 'app-create-lease-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    DatePickerModule,
    DividerModule,
    MessageModule,
  ],
  templateUrl: './create-lease-modal.html',
  styleUrl: './create-lease-modal.css',
})
export class CreateLeaseModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() proposal: LeaseProposalResponse | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<void>();

  private leaseService = inject(LeaseService);
  private propertyService = inject(PropertyService);

  today = new Date();
  minEndDate = new Date(this.today.getFullYear(), this.today.getMonth() + 1, this.today.getDate() + 1);

  startDate: Date | null = null;
  endDate: Date | null = null;
  monthlyRent: number | null = null;
  upfrontPayment: number | null = null;
  securityDeposit: number | null = null;
  agreementDocumentUrl: string | null = null;

  submitting = signal(false);
  uploading = signal(false);
  errorMessage = signal<string | null>(null);
  success = signal(false);

  ngOnChanges(): void {
    if (this.visible && this.proposal) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    const p = this.proposal;
    this.startDate = this.futureDate(p?.startDate ?? null);
    this.endDate = this.parseDate(p?.endDate ?? null);
    this.monthlyRent = p?.monthlyRent ?? null;
    this.upfrontPayment = p?.upfrontPayment ?? null;
    this.securityDeposit = p?.securityDeposit ?? null;
    this.agreementDocumentUrl = null;
    this.errorMessage.set(null);
    this.success.set(false);
    this.submitting.set(false);
    this.uploading.set(false);
    this.onStartDateChange();
  }

  private parseDate(iso: string | null): Date | null {
    return iso ? new Date(iso) : null;
  }

  /** Prefill the start date but never in the past (Create Lease rejects past dates). */
  private futureDate(iso: string | null): Date | null {
    const d = this.parseDate(iso);
    if (!d || d < this.today) return null;
    return d;
  }

  onStartDateChange(): void {
    if (this.startDate) {
      const next = new Date(this.startDate);
      next.setMonth(next.getMonth() + 1);
      next.setDate(next.getDate() + 1);
      this.minEndDate = next;
      if (this.endDate && this.endDate <= this.startDate) {
        this.endDate = null;
      }
    }
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
    return !!this.proposal?.tenantId && !!this.proposal?.propertyId && !!this.startDate && !!this.endDate;
  }

  close(): void {
    if (this.submitting()) return;
    this.visibleChange.emit(false);
  }

  createLease(): void {
    const p = this.proposal;
    if (!p || !p.tenantId || !p.propertyId || !this.startDate || !this.endDate) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.leaseService.create({
      tenantId: p.tenantId,
      propertyId: p.propertyId,
      proposalId: p.id,
      startDate: this.toIsoDate(this.startDate),
      endDate: this.toIsoDate(this.endDate),
      monthlyRent: this.monthlyRent,
      upfrontPayment: this.upfrontPayment,
      securityDeposit: this.securityDeposit,
      agreementDocumentUrl: this.agreementDocumentUrl,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.created.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(extractApiError(err));
      },
    });
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
