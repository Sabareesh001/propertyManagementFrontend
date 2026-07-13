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

  /** GET /api/admin/payments?from=&to= — every payment across the platform (Admin only), paginated. */
  getPayments(
    from?: string | null,
    to?: string | null,
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<AdminPayment>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<PagedResult<AdminPayment>>(`${this.baseUrl}/payments`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  /** GET /api/admin/charges?from=&to= — every charge across the platform (Admin only), paginated. */
  getCharges(
    from?: string | null,
    to?: string | null,
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<AdminCharge>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<PagedResult<AdminCharge>>(`${this.baseUrl}/charges`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  /** GET /api/admin/finance-summary?from=&to= — server-side aggregated KPIs (Admin only), not paginated. */
  getFinanceSummary(from?: string | null, to?: string | null): Observable<AdminFinanceSummary> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<AdminFinanceSummary>(`${this.baseUrl}/finance-summary`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }
}
