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
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AdminFinanceService, AdminCharge } from '../../../core/services/admin-finance.service';
import { CHARGE_TYPES, CHARGE_STATUSES } from '../../../core/services/charge.service';
import {
  formatDate,
  formatMoney,
  formatMoneyPrecise,
  chargeStatusSeverity,
  downloadCsv,
} from '../finance-format';

const CANCELLED = 5;

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

  // ---- Filters ----
  search = signal('');
  type = signal<number | null>(null);
  status = signal<number | null>(null);
  dateRange = signal<Date[] | null>(null);
  amountMin = signal<number | null>(null);
  amountMax = signal<number | null>(null);
  onlyOutstanding = signal(false);

  typeOptions = [{ label: 'All types', value: null }, ...CHARGE_TYPES.map((t) => ({ label: t.name, value: t.id }))];
  statusOptions = [{ label: 'All statuses', value: null }, ...CHARGE_STATUSES.map((s) => ({ label: s.name, value: s.id }))];

  hasActiveFilters = computed(
    () =>
      !!this.search().trim() ||
      this.type() !== null ||
      this.status() !== null ||
      !!this.dateRange()?.[0] ||
      this.amountMin() !== null ||
      this.amountMax() !== null ||
      this.onlyOutstanding(),
  );

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const type = this.type();
    const status = this.status();
    const [start, end] = this.dateRange() ?? [];
    const min = this.amountMin();
    const max = this.amountMax();
    const outstanding = this.onlyOutstanding();
    const endOfDay = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59) : null;

    return this.charges().filter((c) => {
      if (type !== null && c.chargeTypeId !== type) return false;
      if (status !== null && c.statusId !== status) return false;
      if (outstanding && (c.balanceDue ?? 0) <= 0) return false;
      if (min !== null && (c.amount ?? 0) < min) return false;
      if (max !== null && (c.amount ?? 0) > max) return false;
      if (start) {
        if (!c.dueDate) return false;
        const d = new Date(c.dueDate);
        if (d < start) return false;
        if (endOfDay && d > endOfDay) return false;
      }
      if (q) {
        const hay = [
          c.chargeTypeName,
          c.description,
          c.propertyTitle,
          c.tenantName,
          c.tenantEmail,
          c.ownerName,
          c.id,
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
  totalCharged = computed(() => this.filtered().reduce((s, c) => s + (c.amount ?? 0), 0));
  totalCollected = computed(() => this.filtered().reduce((s, c) => s + (c.amountPaid ?? 0), 0));
  totalOutstanding = computed(() =>
    this.filtered()
      .filter((c) => c.statusId !== CANCELLED)
      .reduce((s, c) => s + (c.balanceDue ?? 0), 0),
  );

  // ---- Formatting helpers ----
  money = (v: number | null | undefined) => formatMoney(v);
  moneyPrecise = (v: number | null | undefined) => formatMoneyPrecise(v);
  date = (iso: string | null) => formatDate(iso);
  severity = (id: number | null) => chargeStatusSeverity(id);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    // Filters/export operate client-side over the loaded set, so pull a large page (backend caps at 100).
    this.finance.getCharges(null, null, 1, 100).subscribe({
      next: (res) => {
        this.charges.set(res.items ?? []);
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
    this.type.set(null);
    this.status.set(null);
    this.dateRange.set(null);
    this.amountMin.set(null);
    this.amountMax.set(null);
    this.onlyOutstanding.set(false);
  }

  exportCsv(): void {
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
    const rows = this.filtered().map((c) => [
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
  }
}
