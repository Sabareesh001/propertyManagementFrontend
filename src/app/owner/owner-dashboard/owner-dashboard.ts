import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

import { PropertyService, PropertyDetail } from '../../core/services/property.service';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';
import {
  ChargeService,
  ChargeResponse,
  PaymentResponse,
} from '../../core/services/charge.service';
import {
  LeaseProposalService,
  LeaseProposalResponse,
} from '../../core/services/lease-proposal.service';
import { StripeService, StripeAccountStatus } from '../../core/services/stripe.service';

/** A charge paired with the lease/property it belongs to, for cross-lease listing. */
interface ChargeRow {
  charge: ChargeResponse;
  leaseId: string;
  propertyId: number | null;
  propertyTitle: string;
}

/** A payment paired with the lease/property it was received on. */
interface PaymentRow {
  payment: PaymentResponse;
  leaseId: string;
  propertyId: number | null;
  propertyTitle: string;
}

/** Lease statuses that can carry charges/payments — only these are worth fetching finances for. */
const FINANCIAL_LEASE_STATUSES = new Set([5, 7, 8]); // Active, Terminated, Expired

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TagModule,
    TableModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  templateUrl: './owner-dashboard.html',
  styleUrl: './owner-dashboard.css',
})
export class OwnerDashboardComponent implements OnInit {
  private propertyService = inject(PropertyService);
  private leaseService = inject(LeaseService);
  private chargeService = inject(ChargeService);
  private proposalService = inject(LeaseProposalService);
  private stripeService = inject(StripeService);

  loading = signal(true);
  error = signal(false);
  onboardLoading = signal(false);

  private properties = signal<PropertyDetail[]>([]);
  private leases = signal<LeaseResponse[]>([]);
  private proposals = signal<LeaseProposalResponse[]>([]);
  stripe = signal<StripeAccountStatus | null>(null);

  private chargeRows = signal<ChargeRow[]>([]);
  private paymentRows = signal<PaymentRow[]>([]);

  // ── Financial totals (aggregated across all the owner's leases) ──────────
  totalBilled = computed(() =>
    this.chargeRows().reduce((sum, r) => sum + (r.charge.amount ?? 0), 0),
  );
  totalCollected = computed(() =>
    this.chargeRows().reduce((sum, r) => sum + r.charge.amountPaid, 0),
  );
  totalOutstanding = computed(() =>
    this.chargeRows().reduce((sum, r) => sum + r.charge.balanceDue, 0),
  );
  overdueAmount = computed(() =>
    this.chargeRows()
      .filter((r) => r.charge.statusId === 4)
      .reduce((sum, r) => sum + r.charge.balanceDue, 0),
  );

  /** Charges with a remaining balance, soonest due (and overdue) first. */
  outstandingRows = computed(() =>
    this.chargeRows()
      .filter((r) => r.charge.balanceDue > 0)
      .sort(
        (a, b) =>
          new Date(a.charge.dueDate ?? 0).getTime() -
          new Date(b.charge.dueDate ?? 0).getTime(),
      ),
  );

  /** All payments received, most recent first. */
  recentPayments = computed(() =>
    [...this.paymentRows()].sort(
      (a, b) =>
        new Date(b.payment.paidAt ?? b.payment.createdAt ?? 0).getTime() -
        new Date(a.payment.paidAt ?? a.payment.createdAt ?? 0).getTime(),
    ),
  );

  // ── Portfolio counts ─────────────────────────────────────────────────────
  propertyCount = computed(() => this.properties().length);
  occupiedCount = computed(
    () => this.properties().filter((p) => p.availabilityStatusId === 2).length,
  );
  activeLeaseCount = computed(() => this.leases().filter((l) => l.statusId === 5).length);
  pendingRequestCount = computed(
    () => this.proposals().filter((p) => p.statusId === 2).length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      properties: this.propertyService
        .getMyProperties(1, 100)
        .pipe(
          map((res) => res.items),
          catchError(() => of([] as PropertyDetail[])),
        ),
      leases: this.leaseService
        .getMyLeases(1, 100)
        .pipe(
          map((res) => res.items),
          catchError(() => of([] as LeaseResponse[])),
        ),
      proposals: this.proposalService
        .getReceivedRequests(1, 100)
        .pipe(
          map((res) => res.items),
          catchError(() => of([] as LeaseProposalResponse[])),
        ),
      stripe: this.stripeService.getStatus().pipe(catchError(() => of(null))),
    })
      .pipe(
        switchMap((base) => {
          const financeLeases = base.leases.filter((l) =>
            FINANCIAL_LEASE_STATUSES.has(l.statusId ?? 0),
          );
          if (financeLeases.length === 0) {
            return of({
              ...base,
              financeLeases,
              charges: [] as ChargeResponse[][],
              payments: [] as PaymentResponse[][],
            });
          }
          return forkJoin({
            charges: forkJoin(
              financeLeases.map((l) =>
                this.chargeService
                  .getCharges(l.id, 1, 100)
                  .pipe(
                    map((res) => res.items),
                    catchError(() => of([] as ChargeResponse[])),
                  ),
              ),
            ),
            payments: forkJoin(
              financeLeases.map((l) =>
                this.chargeService
                  .getPayments(l.id, 1, 100)
                  .pipe(
                    map((res) => res.items),
                    catchError(() => of([] as PaymentResponse[])),
                  ),
              ),
            ),
          }).pipe(map((fin) => ({ ...base, financeLeases, ...fin })));
        }),
      )
      .subscribe({
        next: (data) => {
          this.applyData(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private applyData(data: {
    properties: PropertyDetail[];
    leases: LeaseResponse[];
    proposals: LeaseProposalResponse[];
    stripe: StripeAccountStatus | null;
    financeLeases: LeaseResponse[];
    charges: ChargeResponse[][];
    payments: PaymentResponse[][];
  }): void {
    this.properties.set(data.properties);
    this.leases.set(data.leases);
    this.proposals.set(data.proposals);
    this.stripe.set(data.stripe);

    const titleById = new Map<number, string>();
    for (const p of data.properties) titleById.set(p.id, p.title);

    const chargeRows: ChargeRow[] = [];
    const paymentRows: PaymentRow[] = [];

    data.financeLeases.forEach((lease, i) => {
      const propertyTitle =
        lease.propertyId != null
          ? titleById.get(lease.propertyId) ?? `Property #${lease.propertyId}`
          : 'Property';

      for (const charge of data.charges[i] ?? []) {
        if (charge.statusId === 5) continue; // exclude Cancelled from the balance
        chargeRows.push({ charge, leaseId: lease.id, propertyId: lease.propertyId, propertyTitle });
      }
      for (const payment of data.payments[i] ?? []) {
        paymentRows.push({ payment, leaseId: lease.id, propertyId: lease.propertyId, propertyTitle });
      }
    });

    this.chargeRows.set(chargeRows);
    this.paymentRows.set(paymentRows);
  }

  startStripeOnboarding(): void {
    if (this.onboardLoading()) return;
    this.onboardLoading.set(true);
    this.stripeService.onboard().subscribe({
      next: (res) => {
        window.location.href = res.onboardingUrl;
      },
      error: () => this.onboardLoading.set(false),
    });
  }

  // ── Presentation helpers ─────────────────────────────────────────────────
  chargeStatusSeverity(
    statusId: number | null,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (statusId) {
      case 1: return 'info';       // Pending
      case 2: return 'warn';       // Partially Paid
      case 3: return 'success';    // Paid
      case 4: return 'danger';     // Overdue
      default: return 'secondary';
    }
  }

  paymentStatusSeverity(
    statusId: number | null,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
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

  formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  }
}
