import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';
import { ChargeAllocationResponse } from './charge.service';

/**
 * Platform-wide finance data for the Admin dashboard.
 *
 * NOTE: The endpoints below (`/api/admin/payments`, `/api/admin/charges`,
 * `/api/admin/revenue/summary`) do NOT exist in the backend yet — every payment
 * and charge endpoint in the current API is lease-scoped and restricted to the
 * owner/tenant of that lease. See `frontend-design-reference.md` §7. These admin
 * endpoints must be added by the backend; the exact contract expected by this
 * service is written up in the "backend prompt" handed off with this feature.
 */

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

/** Optional server-computed aggregate. The Revenue view falls back to client-side maths if absent. */
export interface AdminRevenueSummary {
  companyRevenue: number;
  grossVolume: number;
  totalCollected: number;
  totalOutstanding: number;
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

  /** GET /api/admin/payments — every payment across the platform (Admin only). */
  getPayments(): Observable<AdminPayment[]> {
    return this.http.get<AdminPayment[]>(`${this.baseUrl}/payments`, WITH_CREDENTIALS);
  }

  /** GET /api/admin/charges — every charge across the platform (Admin only). */
  getCharges(): Observable<AdminCharge[]> {
    return this.http.get<AdminCharge[]>(`${this.baseUrl}/charges`, WITH_CREDENTIALS);
  }

  /** GET /api/admin/revenue/summary — optional server-side KPI aggregate (Admin only). */
  getRevenueSummary(): Observable<AdminRevenueSummary> {
    return this.http.get<AdminRevenueSummary>(`${this.baseUrl}/revenue/summary`, WITH_CREDENTIALS);
  }
}
