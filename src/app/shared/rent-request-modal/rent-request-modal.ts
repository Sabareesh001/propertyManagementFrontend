import { Component, Input, Output, EventEmitter, inject, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { PropertyDetail } from '../../core/services/property.service';
import { LeaseProposalService } from '../../core/services/lease-proposal.service';
import { extractApiError } from '../../core/api.config';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-rent-request-modal',
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
  templateUrl: './rent-request-modal.html',
  styleUrl: './rent-request-modal.css',
})
export class RentRequestModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() property: PropertyDetail | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() proposalSubmitted = new EventEmitter<void>();

  private leaseProposalService = inject(LeaseProposalService);

  today = new Date();
  minEndDate = new Date(this.today.getFullYear(), this.today.getMonth() + 1, this.today.getDate() + 1);

  startDate: Date | null = null;
  endDate: Date | null = null;
  monthlyRent: number | null = null;
  upfrontPayment: number | null = null;
  securityDeposit: number | null = null;

  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  success = signal(false);
  /** Tracks whether the user has attempted to submit — gates showing field errors. */
  formTouched = signal(false);

  ngOnChanges(): void {
    if (this.visible && this.property) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.startDate = null;
    this.endDate = null;
    this.monthlyRent = this.property?.monthlyRent ?? null;
    this.upfrontPayment = this.property?.upfrontPayment ?? null;
    this.securityDeposit = this.property?.securityDeposit ?? null;
    this.errorMessage.set(null);
    this.success.set(false);
    this.submitting.set(false);
    this.formTouched.set(false);
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

  close(): void {
    if (this.submitting()) return;
    this.visibleChange.emit(false);
  }

  // --- Per-field validity getters (only active after first submit attempt) ---

  get startDateInvalid(): boolean {
    return this.formTouched() && !this.startDate;
  }

  get endDateInvalid(): boolean {
    return this.formTouched() && !this.endDate;
  }

  get monthlyRentInvalid(): boolean {
    return this.formTouched() && (this.monthlyRent === null || this.monthlyRent < 0);
  }

  get upfrontPaymentInvalid(): boolean {
    return this.formTouched() && (this.upfrontPayment === null || this.upfrontPayment < 0);
  }

  get securityDepositInvalid(): boolean {
    return this.formTouched() && (this.securityDeposit === null || this.securityDeposit < 0);
  }

  private isFormValid(): boolean {
    if (!this.startDate) return false;
    if (!this.endDate) return false;
    if (this.monthlyRent === null || this.monthlyRent < 0) return false;
    if (this.upfrontPayment === null || this.upfrontPayment < 0) return false;
    if (this.securityDeposit === null || this.securityDeposit < 0) return false;
    return true;
  }

  submitRequest(): void {
    if (!this.property) return;
    this.formTouched.set(true);
    if (!this.isFormValid()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      propertyId: this.property.id,
      startDate: this.toIsoDate(this.startDate!),
      endDate: this.toIsoDate(this.endDate!),
      monthlyRent: this.monthlyRent!,
      upfrontPayment: this.upfrontPayment!,
      securityDeposit: this.securityDeposit!,
    };

    this.leaseProposalService.create(payload).pipe(
      switchMap((proposal) => this.leaseProposalService.submit(proposal.id)),
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.proposalSubmitted.emit();
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
