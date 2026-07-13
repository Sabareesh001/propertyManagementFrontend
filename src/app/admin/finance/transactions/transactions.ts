import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import {
  AdminFinanceService,
  AdminPayment,
  PAYMENT_STATUSES,
} from '../../../core/services/admin-finance.service';
import {
  currencyCode,
  formatDateTime,
  formatMoney,
  formatMoneyPrecise,
  paymentStatusSeverity,
  downloadCsv,
} from '../finance-format';

const COMPLETED = 2;

@Component({
  selector: 'app-finance-transactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './transactions.html',
  styleUrls: ['../finance-shared.css'],
})
export class TransactionsComponent implements OnInit {
  private finance = inject(AdminFinanceService);

  payments = signal<AdminPayment[]>([]);
  loading = signal(true);
  error = signal(false);

  // ---- Filters ----
  search = signal('');
  status = signal<number | null>(null);
  method = signal<string | null>(null);
  dateRange = signal<Date[] | null>(null);
  amountMin = signal<number | null>(null);
  amountMax = signal<number | null>(null);

  statusOptions = [{ label: 'All statuses', value: null }, ...PAYMENT_STATUSES.map((s) => ({ label: s.name, value: s.id }))];

  methodOptions = computed(() => {
    const names = new Set<string>();
    for (const p of this.payments()) if (p.paymentMethodName) names.add(p.paymentMethodName);
    return [{ label: 'All methods', value: null }, ...[...names].sort().map((n) => ({ label: n, value: n }))];
  });

  hasActiveFilters = computed(
    () =>
      !!this.search().trim() ||
      this.status() !== null ||
      this.method() !== null ||
      !!this.dateRange()?.[0] ||
      this.amountMin() !== null ||
      this.amountMax() !== null,
  );

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.status();
    const method = this.method();
    const [start, end] = this.dateRange() ?? [];
    const min = this.amountMin();
    const max = this.amountMax();
    const endOfDay = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59) : null;

    return this.payments().filter((p) => {
      if (status !== null && p.statusId !== status) return false;
      if (method !== null && p.paymentMethodName !== method) return false;
      if (min !== null && (p.amount ?? 0) < min) return false;
      if (max !== null && (p.amount ?? 0) > max) return false;
      if (start) {
        const iso = p.paidAt ?? p.createdAt;
        if (!iso) return false;
        const d = new Date(iso);
        if (d < start) return false;
        if (endOfDay && d > endOfDay) return false;
      }
      if (q) {
        const hay = [
          p.transactionRef,
          p.tenantName,
          p.tenantEmail,
          p.propertyTitle,
          p.ownerName,
          p.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  // ---- Summary over the filtered set ----
  filteredCount = computed(() => this.filtered().length);
  filteredVolume = computed(() =>
    this.filtered()
      .filter((p) => p.statusId === COMPLETED)
      .reduce((s, p) => s + (p.amount ?? 0), 0),
  );
  filteredRevenue = computed(() =>
    this.filtered()
      .filter((p) => p.statusId === COMPLETED)
      .reduce((s, p) => s + (p.platformFee ?? 0), 0),
  );

  // ---- Formatting helpers for the template ----
  money = (v: number | null | undefined) => formatMoney(v);
  moneyPrecise = (v: number | null | undefined, id: number | null = null) =>
    formatMoneyPrecise(v, currencyCode(id));
  dateTime = (iso: string | null) => formatDateTime(iso);
  severity = (id: number | null) => paymentStatusSeverity(id);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    // Filters/export operate client-side over the loaded set, so pull a large page (backend caps at 100).
    this.finance.getPayments(null, null, 1, 100).subscribe({
      next: (res) => {
        this.payments.set(res.items ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  resetFilters(): void {
    this.search.set('');
    this.status.set(null);
    this.method.set(null);
    this.dateRange.set(null);
    this.amountMin.set(null);
    this.amountMax.set(null);
  }

  exportCsv(): void {
    const header = [
      'Transaction Ref',
      'Payment ID',
      'Tenant',
      'Tenant Email',
      'Property',
      'Owner',
      'Method',
      'Amount',
      'Platform Fee',
      'Status',
      'Paid At',
    ];
    const rows = this.filtered().map((p) => [
      p.transactionRef ?? '',
      p.id,
      p.tenantName ?? '',
      p.tenantEmail ?? '',
      p.propertyTitle ?? '',
      p.ownerName ?? '',
      p.paymentMethodName ?? '',
      String(p.amount ?? ''),
      String(p.platformFee ?? ''),
      p.statusName ?? '',
      p.paidAt ?? '',
    ]);
    downloadCsv(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
  }
}
