import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';
import { LeaseCancellationService } from '../../core/services/lease-cancellation.service';
import { extractApiError } from '../../core/api.config';

@Component({
  selector: 'app-request-cancellation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    TextareaModule,
    DatePickerModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './request-cancellation.html',
  styleUrl: './request-cancellation.css',
})
export class RequestCancellationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private leaseService = inject(LeaseService);
  private cancellationService = inject(LeaseCancellationService);

  leaseId = '';
  lease = signal<LeaseResponse | null>(null);
  loading = signal(true);
  error = signal(false);

  today = new Date();

  reason = '';
  requestedEffectiveDate: Date | null = null;
  requestedMoveOutDate: Date | null = null;

  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  success = signal(false);

  ngOnInit(): void {
    this.leaseId = this.route.snapshot.queryParamMap.get('leaseId') ?? '';
    if (!this.leaseId) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.leaseService.getById(this.leaseId).subscribe({
      next: (lease) => {
        this.lease.set(lease);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  get reasonValid(): boolean {
    const len = this.reason.trim().length;
    return len >= 10 && len <= 2000;
  }

  get canSubmit(): boolean {
    return this.reasonValid && !!this.requestedEffectiveDate;
  }

  onEffectiveDateChange(): void {
    if (
      this.requestedMoveOutDate &&
      this.requestedEffectiveDate &&
      this.requestedMoveOutDate < this.requestedEffectiveDate
    ) {
      this.requestedMoveOutDate = null;
    }
  }

  submit(): void {
    if (!this.canSubmit || !this.requestedEffectiveDate) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.cancellationService
      .createRequest({
        leaseId: this.leaseId,
        reason: this.reason.trim(),
        requestedEffectiveDate: this.toIsoDate(this.requestedEffectiveDate),
        requestedMoveOutDate: this.requestedMoveOutDate ? this.toIsoDate(this.requestedMoveOutDate) : null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(extractApiError(err, 'Failed to submit the cancellation request.'));
        },
      });
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  goToMyCancellations(): void {
    this.router.navigate(['/cancellations']);
  }
}
