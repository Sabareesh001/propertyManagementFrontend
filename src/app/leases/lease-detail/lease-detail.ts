import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';
import { extractApiError } from '../../core/api.config';
import {
  ChargeService,
  ChargeResponse,
  PaymentResponse,
} from '../../core/services/charge.service';
import { selectCurrentUser } from '../../store/auth/auth.selectors';
import { AddChargeModalComponent } from '../../shared/add-charge-modal/add-charge-modal';
import { PayChargesModalComponent } from '../../shared/pay-charges-modal/pay-charges-modal';
import { AgreementDocumentModalComponent } from '../../shared/agreement-document-modal/agreement-document-modal';
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';

type ChargeFilter = 'all' | 'outstanding' | 'paid' | 'overdue';

@Component({
  selector: 'app-lease-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TagModule,
    TableModule,
    ToastModule,
    ProgressSpinnerModule,
    SelectButtonModule,
    TooltipModule,
    SkeletonModule,
    MessageModule,
    InputNumberModule,
    ConfirmDialogModule,
    AddChargeModalComponent,
    PayChargesModalComponent,
    AgreementDocumentModalComponent,
    SafeUrlPipe,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './lease-detail.html',
  styleUrl: './lease-detail.css',
})
export class LeaseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private leaseService = inject(LeaseService);
  private chargeService = inject(ChargeService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private store = inject(Store);
  private router = inject(Router);

  private currentUser = toSignal(this.store.select(selectCurrentUser), { initialValue: null });

  leaseId = '';
  lease = signal<LeaseResponse | null>(null);
  charges = signal<ChargeResponse[]>([]);
  payments = signal<PaymentResponse[]>([]);
  loading = signal(true);
  error = signal(false);

  addChargeVisible = signal(false);
  payChargesVisible = signal(false);

  uploadingDocument = signal(false);
  documentError = signal<string | null>(null);
  agreementViewerVisible = signal(false);

  editingFinancials = signal(false);
  savingFinancials = signal(false);
  financialsError = signal<string | null>(null);
  editUpfrontPayment: number | null = null;
  editSecurityDeposit: number | null = null;

  deleting = signal(false);
  submitting = signal(false);

  chargeFilter = signal<ChargeFilter>('all');
  chargeFilterOptions: Array<{ label: string; value: ChargeFilter }> = [
    { label: 'All', value: 'all' },
    { label: 'Outstanding', value: 'outstanding' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
  ];

  /** The current user is the tenant of this lease; anyone else who can load it is the owner (admins use their own screens). */
  isTenant = computed(() => {
    const user = this.currentUser();
    const lease = this.lease();
    return !!user && !!lease && lease.tenantId === user.id;
  });

  isOwner = computed(() => !this.isTenant());

  isActive = computed(() => this.lease()?.statusId === 5);

  /** Owner can edit the lease (financials, agreement document) while it's still Draft. */
  canEditLease = computed(() => this.isOwner() && this.lease()?.statusId === 1);

  totalCharged = computed(() =>
    this.activeCharges().reduce((sum, c) => sum + (c.amount ?? 0), 0),
  );

  totalPaid = computed(() =>
    this.activeCharges().reduce((sum, c) => sum + c.amountPaid, 0),
  );

  totalOutstanding = computed(() =>
    this.activeCharges().reduce((sum, c) => sum + c.balanceDue, 0),
  );

  overdueCount = computed(() => this.charges().filter((c) => c.statusId === 4).length);

  payableCharges = computed(() =>
    this.charges().filter((c) => c.statusId !== 5 && c.balanceDue > 0),
  );

  filteredCharges = computed(() => {
    const charges = this.charges();
    switch (this.chargeFilter()) {
      case 'outstanding':
        return charges.filter((c) => c.statusId !== 5 && c.balanceDue > 0);
      case 'paid':
        return charges.filter((c) => c.statusId === 3);
      case 'overdue':
        return charges.filter((c) => c.statusId === 4);
      default:
        return charges;
    }
  });

  /** Charges excluding Cancelled — the basis for the financial summary. */
  private activeCharges = computed(() => this.charges().filter((c) => c.statusId !== 5));

  ngOnInit(): void {
    this.leaseId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.route.snapshot.queryParamMap.get('justCreated') === '1') {
      this.messageService.add({
        severity: 'info',
        summary: 'Lease Created',
        detail: 'This draft lease must be submitted for admin approval before it becomes active.',
        life: 8000,
      });
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      lease: this.leaseService.getById(this.leaseId),
      charges: this.chargeService
        .getCharges(this.leaseId)
        .pipe(map((res) => res.items), catchError(() => of([] as ChargeResponse[]))),
      payments: this.chargeService
        .getPayments(this.leaseId)
        .pipe(map((res) => res.items), catchError(() => of([] as PaymentResponse[]))),
    }).subscribe({
      next: ({ lease, charges, payments }) => {
        this.lease.set(lease);
        this.charges.set(this.sortCharges(charges));
        this.payments.set(this.sortPayments(payments));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private sortCharges(charges: ChargeResponse[]): ChargeResponse[] {
    return [...charges].sort(
      (a, b) => new Date(b.dueDate ?? 0).getTime() - new Date(a.dueDate ?? 0).getTime(),
    );
  }

  private sortPayments(payments: PaymentResponse[]): PaymentResponse[] {
    return [...payments].sort(
      (a, b) =>
        new Date(b.paidAt ?? b.createdAt ?? 0).getTime() -
        new Date(a.paidAt ?? a.createdAt ?? 0).getTime(),
    );
  }

  private refreshChargesAndPayments(): void {
    forkJoin({
      charges: this.chargeService
        .getCharges(this.leaseId)
        .pipe(map((res) => res.items), catchError(() => of(this.charges()))),
      payments: this.chargeService
        .getPayments(this.leaseId)
        .pipe(map((res) => res.items), catchError(() => of(this.payments()))),
    }).subscribe(({ charges, payments }) => {
      this.charges.set(this.sortCharges(charges));
      this.payments.set(this.sortPayments(payments));
    });
  }

  onChargeCreated(charge: ChargeResponse): void {
    this.charges.update((list) => this.sortCharges([charge, ...list]));
    this.messageService.add({
      severity: 'success',
      summary: 'Charge Applied',
      detail: `${charge.chargeTypeName ?? 'Charge'} of ${this.formatCurrency(charge.amount)} has been applied.`,
    });
  }

  onPaymentComplete(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Payment Successful',
      detail: 'Your payment was processed by Stripe. Charges will update shortly.',
    });
    this.refreshChargesAndPayments();
  }

  openAgreementViewer(): void {
    this.agreementViewerVisible.set(true);
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingDocument.set(true);
    this.documentError.set(null);

    this.leaseService.uploadDocument(file).subscribe({
      next: ({ url }) => {
        this.leaseService.update(this.leaseId, { agreementDocumentUrl: url }).subscribe({
          next: (updated) => {
            this.lease.set(updated);
            this.uploadingDocument.set(false);
            input.value = '';
            this.messageService.add({
              severity: 'success',
              summary: 'Document Attached',
              detail: 'The agreement document has been attached to this lease.',
            });
          },
          error: (err) => {
            this.uploadingDocument.set(false);
            this.documentError.set(extractApiError(err, 'Failed to attach the agreement document.'));
            input.value = '';
          },
        });
      },
      error: (err) => {
        this.uploadingDocument.set(false);
        this.documentError.set(extractApiError(err, 'Failed to upload the agreement document.'));
        input.value = '';
      },
    });
  }

  startEditFinancials(): void {
    const lease = this.lease();
    if (!lease) return;
    this.editUpfrontPayment = lease.upfrontPayment;
    this.editSecurityDeposit = lease.securityDeposit;
    this.financialsError.set(null);
    this.editingFinancials.set(true);
  }

  cancelEditFinancials(): void {
    this.editingFinancials.set(false);
    this.financialsError.set(null);
  }

  saveFinancials(): void {
    this.savingFinancials.set(true);
    this.financialsError.set(null);

    this.leaseService.update(this.leaseId, {
      upfrontPayment: this.editUpfrontPayment,
      securityDeposit: this.editSecurityDeposit,
    }).subscribe({
      next: (updated) => {
        this.lease.set(updated);
        this.savingFinancials.set(false);
        this.editingFinancials.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Lease Updated',
          detail: 'The lease terms have been updated.',
        });
      },
      error: (err) => {
        this.savingFinancials.set(false);
        this.financialsError.set(extractApiError(err, 'Failed to update the lease.'));
      },
    });
  }

  confirmSubmit(): void {
    const lease = this.lease();
    if (!lease?.agreementDocumentUrl) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Agreement Required',
        detail: 'Attach an agreement document to this lease before submitting it for review.',
      });
      return;
    }
    this.confirmationService.confirm({
      message: "Submit this lease for admin review? You won't be able to edit it afterwards.",
      header: 'Submit Lease',
      icon: 'pi pi-send',
      acceptLabel: 'Submit',
      accept: () => this.doSubmit(),
    });
  }

  private doSubmit(): void {
    this.submitting.set(true);
    this.leaseService.submit(this.leaseId).subscribe({
      next: (updated) => {
        this.lease.set(updated);
        this.submitting.set(false);
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'The lease has been submitted for admin review.' });
      },
      error: () => {
        this.submitting.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to submit the lease.' });
      },
    });
  }

  confirmDelete(): void {
    this.confirmationService.confirm({
      message: 'Delete this draft lease? This cannot be undone.',
      header: 'Delete Lease',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => this.deleteLease(),
    });
  }

  private deleteLease(): void {
    this.deleting.set(true);
    this.leaseService.delete(this.leaseId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'The draft lease has been deleted.' });
        this.router.navigate(['/leases']);
      },
      error: () => {
        this.deleting.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete the lease.' });
      },
    });
  }

  chargeForId(chargeId: string): ChargeResponse | undefined {
    return this.charges().find((c) => c.id === chargeId);
  }

  leaseStatusLabel(statusId: number | null): string {
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

  leaseStatusSeverity(statusId: number | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (statusId) {
      case 1: return 'secondary';
      case 2: return 'info';
      case 3: return 'warn';
      case 4: return 'info';
      case 5: return 'success';
      case 6:
      case 7: return 'danger';
      default: return 'secondary';
    }
  }

  chargeStatusSeverity(statusId: number | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (statusId) {
      case 1: return 'info';       // Pending
      case 2: return 'warn';       // Partially Paid
      case 3: return 'success';    // Paid
      case 4: return 'danger';     // Overdue
      case 5: return 'secondary';  // Cancelled
      default: return 'secondary';
    }
  }

  paymentStatusSeverity(statusId: number | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (statusId) {
      case 1: return 'warn';       // Pending
      case 2: return 'success';    // Completed
      case 3: return 'danger';     // Failed
      case 4: return 'info';       // Refunded
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

  formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  }
}
