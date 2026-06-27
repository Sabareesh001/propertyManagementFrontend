import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';

/** Matches the backend ChargeResponseDto. */
export interface ChargeResponse {
  id: string;
  chargeTypeId: number | null;
  chargeTypeName: string | null;
  amount: number | null;
  description: string | null;
  dueDate: string | null;
  statusId: number | null;
  statusName: string | null;
  amountPaid: number;
  balanceDue: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Body for POST /api/lease/{leaseId}/charges. */
export interface ApplyChargePayload {
  chargeTypeId: number;
  amount: number;
  description?: string | null;
  dueDate: string;
}

/** One line of a payment split across charges. */
export interface ChargeAllocation {
  chargeId: string;
  amount: number;
}

/** Body for POST /api/stripe/lease/{leaseId}/payments/intent (RecordPaymentDto shape). */
export interface PaymentIntentPayload {
  chargeAllocations: ChargeAllocation[];
  paymentMethodId: number;
  transactionRef: string;
  currencyId: number;
}

/** Response of POST /api/stripe/lease/{leaseId}/payments/intent. */
export interface PaymentIntentResponse {
  paymentId: string;
  clientSecret: string;
  publishableKey: string;
  amount: number;
  platformFee: number;
  currency: string;
}

/** Matches the backend ChargeAllocationResponseDto. */
export interface ChargeAllocationResponse {
  chargeId: string;
  amountApplied: number | null;
}

/** Matches the backend PaymentResponseDto. */
export interface PaymentResponse {
  id: string;
  amount: number | null;
  transactionRef: string | null;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  statusId: number | null;
  statusName: string | null;
  paidBy: string | null;
  paidAt: string | null;
  currencyId: number | null;
  chargeAllocations: ChargeAllocationResponse[];
  createdAt: string | null;
}

/** Charge type lookup — mirrors the backend ChargeTypes table. */
export const CHARGE_TYPES: ReadonlyArray<{ id: number; name: string; icon: string }> = [
  { id: 1, name: 'Monthly Rent', icon: 'pi pi-calendar' },
  { id: 2, name: 'Security Deposit', icon: 'pi pi-shield' },
  { id: 3, name: 'Upfront Payment', icon: 'pi pi-wallet' },
  { id: 4, name: 'Maintenance', icon: 'pi pi-wrench' },
  { id: 5, name: 'Penalty', icon: 'pi pi-exclamation-circle' },
  { id: 6, name: 'Other', icon: 'pi pi-tag' },
];

/** Charge statuses: 1=Pending, 2=Partially Paid, 3=Paid, 4=Overdue, 5=Cancelled. */
export const CHARGE_STATUSES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: 'Pending' },
  { id: 2, name: 'Partially Paid' },
  { id: 3, name: 'Paid' },
  { id: 4, name: 'Overdue' },
  { id: 5, name: 'Cancelled' },
];

/** Payment method id for Stripe (online) — the only payment channel the UI offers. */
export const STRIPE_PAYMENT_METHOD_ID = 7;

@Injectable({ providedIn: 'root' })
export class ChargeService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/lease`;

  /** GET /api/lease/{leaseId}/charges — all charges on a lease. */
  getCharges(leaseId: string): Observable<ChargeResponse[]> {
    return this.http.get<ChargeResponse[]>(`${this.baseUrl}/${leaseId}/charges`, WITH_CREDENTIALS);
  }

  /** GET /api/lease/{leaseId}/charges/{chargeId} — a single charge. */
  getCharge(leaseId: string, chargeId: string): Observable<ChargeResponse> {
    return this.http.get<ChargeResponse>(
      `${this.baseUrl}/${leaseId}/charges/${chargeId}`,
      WITH_CREDENTIALS,
    );
  }

  /** POST /api/lease/{leaseId}/charges — owner applies a charge to an Active lease. */
  applyCharge(leaseId: string, payload: ApplyChargePayload): Observable<ChargeResponse> {
    return this.http.post<ChargeResponse>(
      `${this.baseUrl}/${leaseId}/charges`,
      payload,
      WITH_CREDENTIALS,
    );
  }

  /** GET /api/lease/{leaseId}/payments — payment history for a lease. */
  getPayments(leaseId: string): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(
      `${this.baseUrl}/${leaseId}/payments`,
      WITH_CREDENTIALS,
    );
  }

  /** POST /api/stripe/lease/{leaseId}/payments/intent — tenant starts a Stripe payment for charges. */
  createPaymentIntent(leaseId: string, payload: PaymentIntentPayload): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(
      `${API_BASE_URL}/api/stripe/lease/${leaseId}/payments/intent`,
      payload,
      WITH_CREDENTIALS,
    );
  }
}
