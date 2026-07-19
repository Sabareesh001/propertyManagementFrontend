import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';
import { ChargeAllocationResponse } from './charge.service';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, PagedResult } from '../models/paged-result.model';

/** Platform-wide finance data for the Admin dashboard — see §11 of frontend-design-reference.md. */

/** A single payment enriched with the lease / property / owner / tenant context an admin needs. */
export interface AdminPayment {
  id: string;
  amount: number | null;
  /** Company revenue earned on this payment (Stripe platform fee). Null for manual payments. */
  platformFee: number | null;
  transactionRef: string | null;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  statusId: number | null; // 1=Pending 2=Completed 3=Failed 4=Refunded
  statusName: string | null;
  paidBy: string | null;
  paidAt: string | null;
  currencyId: number | null;
  createdAt: string | null;
  chargeAllocations: ChargeAllocationResponse[];
  leaseId: string | null;
  propertyId: number | null;
  propertyTitle: string | null;
  ownerId: string | null;
  ownerName: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
}

/** A single charge enriched with the lease / property / owner / tenant context an admin needs. */
export interface AdminCharge {
  id: string;
  chargeTypeId: number | null;
  chargeTypeName: string | null;
  amount: number | null;
  description: string | null;
  dueDate: string | null;
  statusId: number | null; // 1=Pending 2=PartiallyPaid 3=Paid 4=Overdue 5=Cancelled
  statusName: string | null;
  amountPaid: number;
  balanceDue: number;
  createdAt: string | null;
  updatedAt: string | null;
  leaseId: string | null;
  propertyId: number | null;
  propertyTitle: string | null;
  ownerId: string | null;
  ownerName: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
}

/** Matches the backend AdminFinanceSummaryDto (GET /api/admin/finance-summary). */
export interface AdminFinanceSummary {
  /** Sum of platform fees on Completed payments. */
  companyRevenue: number;
  /** Sum of amounts on Completed payments. */
  grossVolume: number;
  /** Sum of amounts on Pending payments. */
  pendingAmount: number;
  paymentCount: number;
  completedCount: number;
  failedCount: number;
  refundedCount: number;
}

/** Server-side aggregated figures across all charges matching the same filter as the list. */
export interface AdminChargesSummary {
  count: number;
  totalCharged: number;
  totalCollected: number;
  totalOutstanding: number;
}

/** Filters for GET /api/admin/charges (+ /charges-summary). Combined with AND semantics, applied server-side. */
export interface AdminChargeFilters {
  search?: string | null;
  chargeTypeId?: number | null;
  statusId?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  onlyOutstanding?: boolean | null;
  from?: string | null;
  to?: string | null;
  sortField?: string | null;
  sortOrder?: number | null; // 1 asc, -1 desc
}

/** Filters for GET /api/admin/payments (+ /finance-summary). Combined with AND semantics, applied server-side. */
export interface AdminPaymentFilters {
  search?: string | null;
  statusId?: number | null;
  paymentMethod?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  from?: string | null;
  to?: string | null;
  sortField?: string | null;
  sortOrder?: number | null; // 1 asc, -1 desc
}

/** Payment statuses (1=Pending 2=Completed 3=Failed 4=Refunded). */
export const PAYMENT_STATUSES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: 'Pending' },
  { id: 2, name: 'Completed' },
  { id: 3, name: 'Failed' },
  { id: 4, name: 'Refunded' },
];

@Injectable({ providedIn: 'root' })
export class AdminFinanceService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/admin`;

  /** Append the payment filter params shared by the list and summary endpoints (only when set). */
  private paymentParams(f: AdminPaymentFilters, params: HttpParams): HttpParams {
    if (f.search) params = params.set('search', f.search);
    if (f.statusId != null) params = params.set('statusId', f.statusId);
    if (f.paymentMethod) params = params.set('paymentMethod', f.paymentMethod);
    if (f.minAmount != null) params = params.set('minAmount', f.minAmount);
    if (f.maxAmount != null) params = params.set('maxAmount', f.maxAmount);
    if (f.from) params = params.set('from', f.from);
    if (f.to) params = params.set('to', f.to);
    return params;
  }

  /** Append the charge filter params shared by the list and summary endpoints (only when set). */
  private chargeParams(f: AdminChargeFilters, params: HttpParams): HttpParams {
    if (f.search) params = params.set('search', f.search);
    if (f.chargeTypeId != null) params = params.set('chargeTypeId', f.chargeTypeId);
    if (f.statusId != null) params = params.set('statusId', f.statusId);
    if (f.minAmount != null) params = params.set('minAmount', f.minAmount);
    if (f.maxAmount != null) params = params.set('maxAmount', f.maxAmount);
    if (f.onlyOutstanding) params = params.set('onlyOutstanding', true);
    if (f.from) params = params.set('from', f.from);
    if (f.to) params = params.set('to', f.to);
    return params;
  }

  /** GET /api/admin/payments — every payment across the platform (Admin only), server-filtered & paginated. */
  getPayments(
    filters: AdminPaymentFilters = {},
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<AdminPayment>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    params = this.paymentParams(filters, params);
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder != null) params = params.set('sortOrder', filters.sortOrder);
    return this.http.get<PagedResult<AdminPayment>>(`${this.baseUrl}/payments`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  /** GET /api/admin/charges — every charge across the platform (Admin only), server-filtered & paginated. */
  getCharges(
    filters: AdminChargeFilters = {},
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<AdminCharge>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    params = this.chargeParams(filters, params);
    if (filters.sortField) params = params.set('sortField', filters.sortField);
    if (filters.sortOrder != null) params = params.set('sortOrder', filters.sortOrder);
    return this.http.get<PagedResult<AdminCharge>>(`${this.baseUrl}/charges`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  /** GET /api/admin/finance-summary — payment KPIs over the same filter (Admin only), not paginated. */
  getFinanceSummary(filters: AdminPaymentFilters = {}): Observable<AdminFinanceSummary> {
    const params = this.paymentParams(filters, new HttpParams());
    return this.http.get<AdminFinanceSummary>(`${this.baseUrl}/finance-summary`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  /** GET /api/admin/charges-summary — charge KPIs over the same filter (Admin only), not paginated. */
  getChargesSummary(filters: AdminChargeFilters = {}): Observable<AdminChargesSummary> {
    const params = this.chargeParams(filters, new HttpParams());
    return this.http.get<AdminChargesSummary>(`${this.baseUrl}/charges-summary`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }
}
