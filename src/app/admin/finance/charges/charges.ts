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
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import {
  AdminFinanceService,
  AdminCharge,
  AdminChargeFilters,
  AdminChargesSummary,
} from '../../../core/services/admin-finance.service';
import { CHARGE_TYPES, CHARGE_STATUSES } from '../../../core/services/charge.service';
import { DEFAULT_PAGE_NUMBER } from '../../../core/models/paged-result.model';
import {
  formatDate,
  formatMoney,
  formatMoneyPrecise,
  chargeStatusSeverity,
  downloadCsv,
} from '../finance-format';

/** Large page pulled only for CSV export so the file contains every matching row, not just the visible page. */
const EXPORT_PAGE_SIZE = 10000;

@Component({
  selector: 'app-finance-charges',
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
    ToggleSwitchModule,
  ],
  templateUrl: './charges.html',
  styleUrls: ['../finance-shared.css'],
})
export class ChargesComponent implements OnInit {
  private finance = inject(AdminFinanceService);

  charges = signal<AdminCharge[]>([]);
  loading = signal(true);
  error = signal(false);

  // ---- Server-side paging & sort ----
  totalRecords = signal(0);
  first = signal(0);
  pageSize = signal(15);
  sortField = signal<string | null>(null);
  sortOrder = signal<number | null>(null);

  // ---- Server-side aggregated summary (over the whole filtered set, not just the page) ----
  summary = signal<AdminChargesSummary>({ count: 0, totalCharged: 0, totalCollected: 0, totalOutstanding: 0 });

  // ---- Filters ----
  /** Bound to the input directly so typing feels instant; the debounced `search` drives the actual request. */
  searchInput = signal('');
  search = signal('');
  type = signal<number | null>(null);
  status = signal<number | null>(null);
  dateRange = signal<Date[] | null>(null);
  amountMin = signal<number | null>(null);
  amountMax = signal<number | null>(null);
  onlyOutstanding = signal(false);

  private searchChanged$ = new Subject<string>();

  typeOptions = [{ label: 'All types', value: null }, ...CHARGE_TYPES.map((t) => ({ label: t.name, value: t.id }))];
  statusOptions = [{ label: 'All statuses', value: null }, ...CHARGE_STATUSES.map((s) => ({ label: s.name, value: s.id }))];

  hasActiveFilters = computed(
    () =>
      !!this.searchInput().trim() ||
      this.type() !== null ||
      this.status() !== null ||
      !!this.dateRange()?.[0] ||
      this.amountMin() !== null ||
      this.amountMax() !== null ||
      this.onlyOutstanding(),
  );

  // ---- Formatting helpers ----
  money = (v: number | null | undefined) => formatMoney(v);
  moneyPrecise = (v: number | null | undefined) => formatMoneyPrecise(v);
  date = (iso: string | null) => formatDate(iso);
  severity = (id: number | null) => chargeStatusSeverity(id);

  ngOnInit(): void {
    this.searchChanged$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((q) => {
      this.search.set(q);
      this.resetPage();
      this.load();
    });
    this.load();
  }

  /** Build the server-side filter object from the current filter signals. */
  private currentFilters(): AdminChargeFilters {
    const [start, end] = this.dateRange() ?? [];
    const endOfDay = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59) : null;
    return {
      search: this.search().trim() || null,
      chargeTypeId: this.type(),
      statusId: this.status(),
      minAmount: this.amountMin(),
      maxAmount: this.amountMax(),
      onlyOutstanding: this.onlyOutstanding() || null,
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
      page: this.finance.getCharges(filters, pageNumber, this.pageSize()),
      summary: this.finance.getChargesSummary(filters),
    }).subscribe({
      next: ({ page, summary }) => {
        this.charges.set(page.items ?? []);
        this.totalRecords.set(page.totalCount ?? 0);
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
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

  setType(value: number | null): void {
    this.type.set(value);
    this.resetPage();
    this.load();
  }

  setStatus(value: number | null): void {
    this.status.set(value);
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

  setOnlyOutstanding(value: boolean): void {
    this.onlyOutstanding.set(value);
    this.resetPage();
    this.load();
  }

  resetFilters(): void {
    this.searchInput.set('');
    this.search.set('');
    this.type.set(null);
    this.status.set(null);
    this.dateRange.set(null);
    this.amountMin.set(null);
    this.amountMax.set(null);
    this.onlyOutstanding.set(false);
    this.resetPage();
    this.load();
  }

  exportCsv(): void {
    // Export the full filtered set, not just the visible page — fetch every matching row from the server.
    this.finance.getCharges({ ...this.currentFilters() }, DEFAULT_PAGE_NUMBER, EXPORT_PAGE_SIZE).subscribe((res) => {
      const header = [
        'Charge ID',
        'Type',
        'Description',
        'Property',
        'Tenant',
        'Owner',
        'Amount',
        'Paid',
        'Balance Due',
        'Status',
        'Due Date',
      ];
      const rows = (res.items ?? []).map((c) => [
        c.id,
        c.chargeTypeName ?? '',
        c.description ?? '',
        c.propertyTitle ?? '',
        c.tenantName ?? '',
        c.ownerName ?? '',
        String(c.amount ?? ''),
        String(c.amountPaid ?? ''),
        String(c.balanceDue ?? ''),
        c.statusName ?? '',
        c.dueDate ?? '',
      ]);
      downloadCsv(`charges-${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
    });
  }
}
