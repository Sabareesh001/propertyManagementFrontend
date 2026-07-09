import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
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
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';
import {
  ChargeService,
  ChargeResponse,
  PaymentResponse,
} from '../../core/services/charge.service';
import { selectCurrentUser } from '../../store/auth/auth.selectors';
import { AddChargeModalComponent } from '../../shared/add-charge-modal/add-charge-modal';
import { PayChargesModalComponent } from '../../shared/pay-charges-modal/pay-charges-modal';

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
    AddChargeModalComponent,
    PayChargesModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './lease-detail.html',
  styleUrl: './lease-detail.css',
})
export class LeaseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private leaseService = inject(LeaseService);
  private chargeService = inject(ChargeService);
  private messageService = inject(MessageService);
  private store = inject(Store);

  private currentUser = toSignal(this.store.select(selectCurrentUser), { initialValue: null });

  leaseId = '';
  lease = signal<LeaseResponse | null>(null);
  charges = signal<ChargeResponse[]>([]);
  payments = signal<PaymentResponse[]>([]);
  loading = signal(true);
  error = signal(false);

  addChargeVisible = signal(false);
  payChargesVisible = signal(false);

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
