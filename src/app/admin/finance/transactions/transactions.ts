import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
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
  AdminPaymentFilters,
  AdminFinanceSummary,
  PAYMENT_STATUSES,
} from '../../../core/services/admin-finance.service';
import { DEFAULT_PAGE_NUMBER } from '../../../core/models/paged-result.model';
import {
  currencyCode,
  formatDateTime,
  formatMoney,
  formatMoneyPrecise,
  paymentStatusSeverity,
  downloadCsv,
} from '../finance-format';

/** Large page pulled only for CSV export so the file contains every matching row, not just the visible page. */
const EXPORT_PAGE_SIZE = 10000;

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

  // ---- Server-side paging & sort ----
  totalRecords = signal(0);
  first = signal(0);
  pageSize = signal(15);
  sortField = signal<string | null>(null);
  sortOrder = signal<number | null>(null);

  // ---- Server-side aggregated summary (over the whole filtered set, not just the page) ----
  summary = signal<AdminFinanceSummary | null>(null);

  // ---- Filters ----
  /** Bound to the input directly so typing feels instant; the debounced `search` drives the actual request. */
  searchInput = signal('');
  search = signal('');
  status = signal<number | null>(null);
  method = signal<string | null>(null);
  dateRange = signal<Date[] | null>(null);
  amountMin = signal<number | null>(null);
  amountMax = signal<number | null>(null);

  private searchChanged$ = new Subject<string>();

  statusOptions = [{ label: 'All statuses', value: null }, ...PAYMENT_STATUSES.map((s) => ({ label: s.name, value: s.id }))];

  // Method names come from the data. With server-side paging we only see one page at a time, so we accumulate
  // every distinct name seen across loads (never removing) to keep the dropdown options stable while browsing.
  private methodNames = signal<Set<string>>(new Set());
  methodOptions = computed(() => [
    { label: 'All methods', value: null },
    ...[...this.methodNames()].sort().map((n) => ({ label: n, value: n })),
  ]);

  hasActiveFilters = computed(
    () =>
      !!this.searchInput().trim() ||
      this.status() !== null ||
      this.method() !== null ||
      !!this.dateRange()?.[0] ||
      this.amountMin() !== null ||
      this.amountMax() !== null,
  );

  // ---- Summary tile accessors (server-provided) ----
  filteredCount = computed(() => this.summary()?.paymentCount ?? 0);
  filteredVolume = computed(() => this.summary()?.grossVolume ?? 0);
  filteredRevenue = computed(() => this.summary()?.companyRevenue ?? 0);

  // ---- Formatting helpers for the template ----
  money = (v: number | null | undefined) => formatMoney(v);
  moneyPrecise = (v: number | null | undefined, id: number | null = null) =>
    formatMoneyPrecise(v, currencyCode(id));
  dateTime = (iso: string | null) => formatDateTime(iso);
  severity = (id: number | null) => paymentStatusSeverity(id);

  ngOnInit(): void {
    this.searchChanged$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((q) => {
      this.search.set(q);
      this.resetPage();
      this.load();
    });
    this.load();
  }

  /** Build the server-side filter object from the current filter signals. */
  private currentFilters(): AdminPaymentFilters {
    const [start, end] = this.dateRange() ?? [];
    const endOfDay = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59) : null;
    return {
      search: this.search().trim() || null,
      statusId: this.status(),
      paymentMethod: this.method(),
      minAmount: this.amountMin(),
      maxAmount: this.amountMax(),
      from: start ? start.toISOString() : null,
      to: endOfDay ? endOfDay.toISOString() : null,
      sortField: this.sortField(),
      sortOrder: this.sortOrder(),
    };
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const filters = this.currentFilters();
    const pageNumber = Math.floor(this.first() / this.pageSize()) + 1;
    // Filtering, sorting and aggregation are all done server-side so results span the whole DB, not one page.
    forkJoin({
      page: this.finance.getPayments(filters, pageNumber, this.pageSize()),
      summary: this.finance.getFinanceSummary(filters),
    }).subscribe({
      next: ({ page, summary }) => {
        const items = page.items ?? [];
        this.payments.set(items);
        this.totalRecords.set(page.totalCount ?? 0);
        this.summary.set(summary);
        this.rememberMethods(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Accumulate distinct payment-method names for the filter dropdown. */
  private rememberMethods(items: AdminPayment[]): void {
    const next = new Set(this.methodNames());
    let changed = false;
    for (const p of items) {
      if (p.paymentMethodName && !next.has(p.paymentMethodName)) {
        next.add(p.paymentMethodName);
        changed = true;
      }
    }
    if (changed) this.methodNames.set(next);
  }

  /** Fired by the PrimeNG table for page changes and column sorting. */
  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
    this.sortField.set(field ?? null);
    this.sortOrder.set(field ? (event.sortOrder ?? null) : null);
    this.load();
  }

  /** A filter changed — jump back to the first page before reloading. */
  private resetPage(): void {
    this.first.set(0);
  }

  onSearchInput(value: string): void {
    this.searchInput.set(value);
    this.searchChanged$.next(value);
  }

  setStatus(value: number | null): void {
    this.status.set(value);
    this.resetPage();
    this.load();
  }

  setMethod(value: string | null): void {
    this.method.set(value);
    this.resetPage();
    this.load();
  }

  setDateRange(value: Date[] | null): void {
    this.dateRange.set(value);
    // Wait for a complete range (or a cleared range) before hitting the server.
    if (value && value[0] && !value[1]) return;
    this.resetPage();
    this.load();
  }

  setAmountMin(value: number | null): void {
    this.amountMin.set(value);
    this.resetPage();
    this.load();
  }

  setAmountMax(value: number | null): void {
    this.amountMax.set(value);
    this.resetPage();
    this.load();
  }

  resetFilters(): void {
    this.searchInput.set('');
    this.search.set('');
    this.status.set(null);
    this.method.set(null);
    this.dateRange.set(null);
    this.amountMin.set(null);
    this.amountMax.set(null);
    this.resetPage();
    this.load();
  }

  exportCsv(): void {
    // Export the full filtered set, not just the visible page — fetch every matching row from the server.
    this.finance.getPayments({ ...this.currentFilters() }, DEFAULT_PAGE_NUMBER, EXPORT_PAGE_SIZE).subscribe((res) => {
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
      const rows = (res.items ?? []).map((p) => [
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
    });
  }
}
