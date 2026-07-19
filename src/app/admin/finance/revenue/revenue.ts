import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import {
  AdminFinanceService,
  AdminPayment,
  AdminCharge,
} from '../../../core/services/admin-finance.service';
import { formatMoney, formatMoneyPrecise } from '../finance-format';

const COMPLETED = 2; // payment statusId
const CANCELLED_CHARGE = 5; // charge statusId

interface RangeOption {
  label: string;
  value: 'month' | '30d' | 'year' | 'all';
}

interface Bar {
  name: string;
  primary: number;
  secondary?: number;
  count: number;
  pct: number;
}

@Component({
  selector: 'app-finance-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule, SkeletonModule, TagModule],
  templateUrl: './revenue.html',
  styleUrls: ['../finance-shared.css'],
})
export class RevenueComponent implements OnInit {
  private finance = inject(AdminFinanceService);

  payments = signal<AdminPayment[]>([]);
  charges = signal<AdminCharge[]>([]);
  loading = signal(true);
  error = signal(false);

  rangeOptions: RangeOption[] = [
    { label: 'This month', value: 'month' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'This year', value: 'year' },
    { label: 'All time', value: 'all' },
  ];
  range = signal<RangeOption['value']>('all');

  private rangeStart = computed<Date | null>(() => {
    const now = new Date();
    switch (this.range()) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return null;
    }
  });

  private inRange = (iso: string | null): boolean => {
    const start = this.rangeStart();
    if (!start) return true;
    if (!iso) return false;
    return new Date(iso) >= start;
  };

  filteredPayments = computed(() =>
    this.payments().filter((p) => this.inRange(p.paidAt ?? p.createdAt)),
  );
  filteredCharges = computed(() =>
    this.charges().filter((c) => this.inRange(c.createdAt ?? c.dueDate)),
  );

  private completed = computed(() =>
    this.filteredPayments().filter((p) => p.statusId === COMPLETED),
  );

  companyRevenue = computed(() => this.completed().reduce((s, p) => s + (p.platformFee ?? 0), 0));
  hasFeeData = computed(() => this.completed().some((p) => p.platformFee != null));
  grossVolume = computed(() => this.completed().reduce((s, p) => s + (p.amount ?? 0), 0));

  totalCollected = computed(() => this.filteredCharges().reduce((s, c) => s + (c.amountPaid ?? 0), 0));
  totalCharged = computed(() => this.filteredCharges().reduce((s, c) => s + (c.amount ?? 0), 0));
  totalOutstanding = computed(() =>
    this.filteredCharges()
      .filter((c) => c.statusId !== CANCELLED_CHARGE)
      .reduce((s, c) => s + (c.balanceDue ?? 0), 0),
  );

  paymentCount = computed(() => this.filteredPayments().length);
  completedCount = computed(() => this.completed().length);
  failedCount = computed(() => this.filteredPayments().filter((p) => p.statusId === 3).length);
  refundedCount = computed(() => this.filteredPayments().filter((p) => p.statusId === 4).length);
  pendingCount = computed(() => this.filteredPayments().filter((p) => p.statusId === 1).length);
  successRate = computed(() => {
    const total = this.paymentCount();
    return total ? Math.round((this.completedCount() / total) * 100) : 0;
  });

  collectionRate = computed(() => {
    const charged = this.totalCharged();
    return charged ? Math.round((this.totalCollected() / charged) * 100) : 0;
  });

  /** Completed payment volume grouped by payment method. */
  byMethod = computed<Bar[]>(() => {
    const map = new Map<string, { volume: number; count: number }>();
    for (const p of this.completed()) {
      const key = p.paymentMethodName ?? 'Unknown';
      const cur = map.get(key) ?? { volume: 0, count: 0 };
      cur.volume += p.amount ?? 0;
      cur.count += 1;
      map.set(key, cur);
    }
    return this.toBars([...map].map(([name, v]) => ({ name, primary: v.volume, count: v.count })));
  });

  /** Charges grouped by type (charged vs collected). */
  byChargeType = computed<Bar[]>(() => {
    const map = new Map<string, { charged: number; collected: number; count: number }>();
    for (const c of this.filteredCharges()) {
      const key = c.chargeTypeName ?? 'Unknown';
      const cur = map.get(key) ?? { charged: 0, collected: 0, count: 0 };
      cur.charged += c.amount ?? 0;
      cur.collected += c.amountPaid ?? 0;
      cur.count += 1;
      map.set(key, cur);
    }
    return this.toBars(
      [...map].map(([name, v]) => ({
        name,
        primary: v.charged,
        secondary: v.collected,
        count: v.count,
      })),
    );
  });

  /** Company revenue per calendar month over the last 12 months (ignores the range filter). */
  byMonth = computed<Bar[]>(() => {
    const buckets: { key: string; label: string; primary: number; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        primary: 0,
        count: 0,
      });
    }
    const index = new Map(buckets.map((b) => [b.key, b]));
    for (const p of this.payments()) {
      if (p.statusId !== COMPLETED) continue;
      const iso = p.paidAt ?? p.createdAt;
      if (!iso) continue;
      const d = new Date(iso);
      const b = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (b) {
        b.primary += p.platformFee ?? 0;
        b.count += 1;
      }
    }
    const max = Math.max(1, ...buckets.map((b) => b.primary));
    return buckets.map((b) => ({
      name: b.label,
      primary: b.primary,
      count: b.count,
      pct: Math.round((b.primary / max) * 100),
    }));
  });

  private toBars(rows: { name: string; primary: number; secondary?: number; count: number }[]): Bar[] {
    const max = Math.max(1, ...rows.map((r) => r.primary));
    return rows
      .sort((a, b) => b.primary - a.primary)
      .map((r) => ({ ...r, pct: Math.round((r.primary / max) * 100) }));
  }

  money = (v: number | null | undefined) => formatMoney(v);
  moneyPrecise = (v: number | null | undefined) => formatMoneyPrecise(v);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      // Aggregates are computed client-side over the loaded set, so pull a large page (backend caps at 100).
      payments: this.finance.getPayments({}, 1, 100).pipe(map((res) => res.items)),
      charges: this.finance.getCharges({}, 1, 100).pipe(map((res) => res.items)),
    }).subscribe({
      next: ({ payments, charges }) => {
        this.payments.set(payments ?? []);
        this.charges.set(charges ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
