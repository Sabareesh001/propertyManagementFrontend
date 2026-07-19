import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  LeaseCancellationService,
  LeaseCancellationResponse,
} from '../../core/services/lease-cancellation.service';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';
import { selectCurrentUser } from '../../store/auth/auth.selectors';
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
import { extractApiError } from '../../core/api.config';

@Component({
  selector: 'app-cancellation-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    TagModule,
    TextareaModule,
    DatePickerModule,
    InputNumberModule,
    DividerModule,
    MessageModule,
    ProgressSpinnerModule,
    SafeUrlPipe,
  ],
  templateUrl: './cancellation-detail.html',
  styleUrl: './cancellation-detail.css',
})
export class CancellationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cancellationService = inject(LeaseCancellationService);
  private leaseService = inject(LeaseService);
  private store = inject(Store);

  private currentUser = toSignal(this.store.select(selectCurrentUser), { initialValue: null });

  mode = signal<'create' | 'view'>('view');
  cancellationId = '';
  leaseId = '';

  lease = signal<LeaseResponse | null>(null);
  cancellation = signal<LeaseCancellationResponse | null>(null);

  loading = signal(true);
  error = signal(false);

  today = new Date();

  reason = '';
  effectiveDate: Date | null = null;
  moveOutDate: Date | null = null;
  securityDepositRefundAmount: number | null = null;
  depositDispositionNotes = '';
  agreementDocumentUrl: string | null = null;
  signedAgreementDocumentUrl: string | null = null;

  saving = signal(false);
  submitting = signal(false);
  signing = signal(false);
  uploading = signal(false);
  errorMessage = signal<string | null>(null);
  createdSuccess = signal(false);

  isTenant = computed(() => {
    const user = this.currentUser();
    const lease = this.lease();
    return !!user && !!lease && lease.tenantId === user.id;
  });

  isOwner = computed(() => !!this.lease() && !this.isTenant());

  canEdit = computed(() => {
    const c = this.cancellation();
    return this.mode() === 'view' && this.isOwner() && !!c && (c.statusId === 1 || c.statusId === 2);
  });

  canSign = computed(() => {
    const c = this.cancellation();
    return this.isTenant() && !!c && c.statusId === 3;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cancellationId = id;
      this.mode.set('view');
      this.loadCancellation();
    } else {
      this.leaseId = this.route.snapshot.queryParamMap.get('leaseId') ?? '';
      this.mode.set('create');
      this.loadLeaseForCreate();
    }
  }

  private loadCancellation(): void {
    this.loading.set(true);
    this.error.set(false);
    this.cancellationService.getById(this.cancellationId).subscribe({
      next: (c) => {
        this.cancellation.set(c);
        this.leaseId = c.leaseId;
        this.hydrateForm(c);
        this.leaseService.getById(c.leaseId).subscribe({
          next: (lease) => {
            this.lease.set(lease);
            this.loading.set(false);
          },
          error: () => {
            this.error.set(true);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadLeaseForCreate(): void {
    if (!this.leaseId) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
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

  private hydrateForm(c: LeaseCancellationResponse): void {
    this.reason = c.reason ?? '';
    this.effectiveDate = c.effectiveDate ? new Date(c.effectiveDate) : null;
    this.moveOutDate = c.moveOutDate ? new Date(c.moveOutDate) : null;
    this.securityDepositRefundAmount = c.securityDepositRefundAmount;
    this.depositDispositionNotes = c.depositDispositionNotes ?? '';
    this.agreementDocumentUrl = c.agreementDocumentUrl;
    this.signedAgreementDocumentUrl = c.signedAgreementDocumentUrl;
  }

  get reasonValid(): boolean {
    const len = this.reason.trim().length;
    return len >= 10 && len <= 2000;
  }

  get canSubmitForm(): boolean {
    return this.reasonValid && !!this.effectiveDate;
  }

  onEffectiveDateChange(): void {
    if (this.moveOutDate && this.effectiveDate && this.moveOutDate < this.effectiveDate) {
      this.moveOutDate = null;
    }
  }

  onAgreementDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.errorMessage.set(null);
    this.leaseService.uploadDocument(file).subscribe({
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

  clearAgreementDoc(): void {
    this.agreementDocumentUrl = null;
  }

  onSignedDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.errorMessage.set(null);
    this.leaseService.uploadDocument(file).subscribe({
      next: ({ url }) => {
        this.signedAgreementDocumentUrl = url;
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.errorMessage.set(extractApiError(err, 'Failed to upload the signed document.'));
        input.value = '';
      },
    });
  }

  clearSignedDoc(): void {
    this.signedAgreementDocumentUrl = null;
  }

  create(): void {
    if (!this.canSubmitForm || !this.effectiveDate) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.cancellationService
      .create({
        leaseId: this.leaseId,
        reason: this.reason.trim(),
        effectiveDate: this.toIsoDate(this.effectiveDate),
        moveOutDate: this.moveOutDate ? this.toIsoDate(this.moveOutDate) : null,
        securityDepositRefundAmount: this.securityDepositRefundAmount,
        depositDispositionNotes: this.depositDispositionNotes.trim() || null,
        agreementDocumentUrl: this.agreementDocumentUrl,
      })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.router.navigate(['/cancellations', created.id], { replaceUrl: true });
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(extractApiError(err, 'Failed to create the cancellation.'));
        },
      });
  }

  save(): void {
    if (!this.canSubmitForm || !this.effectiveDate) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.cancellationService
      .update(this.cancellationId, {
        reason: this.reason.trim(),
        effectiveDate: this.toIsoDate(this.effectiveDate),
        moveOutDate: this.moveOutDate ? this.toIsoDate(this.moveOutDate) : null,
        securityDepositRefundAmount: this.securityDepositRefundAmount,
        depositDispositionNotes: this.depositDispositionNotes.trim() || null,
        agreementDocumentUrl: this.agreementDocumentUrl,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.cancellation.set(updated);
          this.hydrateForm(updated);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(extractApiError(err, 'Failed to save changes.'));
        },
      });
  }

  submit(): void {
    if (!this.agreementDocumentUrl) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.cancellationService.submit(this.cancellationId).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.cancellation.set(updated);
        this.hydrateForm(updated);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(extractApiError(err, 'Failed to submit for review.'));
      },
    });
  }

  sign(): void {
    if (!this.signedAgreementDocumentUrl) return;
    this.signing.set(true);
    this.errorMessage.set(null);
    this.cancellationService.sign(this.cancellationId, this.signedAgreementDocumentUrl).subscribe({
      next: (updated) => {
        this.signing.set(false);
        this.cancellation.set(updated);
        this.hydrateForm(updated);
      },
      error: (err) => {
        this.signing.set(false);
        this.errorMessage.set(extractApiError(err, 'Failed to sign the cancellation agreement.'));
      },
    });
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

  statusSeverity(statusId: number | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (statusId) {
      case 1: return 'secondary';
      case 2: return 'warn';
      case 3: return 'info';
      case 4: return 'info';
      case 5: return 'success';
      case 6: return 'danger';
      default: return 'secondary';
    }
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  }
}
