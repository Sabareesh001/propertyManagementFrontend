import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBaseUrl, WITH_CREDENTIALS } from '../api.config';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, PagedResult } from '../models/paged-result.model';

/** Body for POST /api/leasecancellation/requests. */
export interface CreateCancellationRequestPayload {
  leaseId: string;
  reason: string;
  requestedEffectiveDate: string;
  requestedMoveOutDate?: string | null;
}

/** Matches the backend LeaseCancellationRequestResponseDto. */
export interface LeaseCancellationRequestResponse {
  id: string;
  leaseId: string;
  tenantId: string;
  reason: string | null;
  requestedEffectiveDate: string;
  requestedMoveOutDate: string | null;
  statusId: number; // 1=Submitted, 2=Accepted, 3=Rejected, 4=Withdrawn
  statusName: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  leaseCancellationId: string | null;
  createdAt: string | null;
}

/** Body for POST /api/leasecancellation (owner-initiated) and PUT /{id} (partial update). */
export interface CreateLeaseCancellationPayload {
  leaseId: string;
  requestId?: string | null;
  reason: string;
  effectiveDate: string;
  moveOutDate?: string | null;
  securityDepositRefundAmount?: number | null;
  depositDispositionNotes?: string | null;
  agreementDocumentUrl?: string | null;
}

export interface UpdateLeaseCancellationPayload {
  reason?: string;
  effectiveDate?: string;
  moveOutDate?: string | null;
  securityDepositRefundAmount?: number | null;
  depositDispositionNotes?: string | null;
  agreementDocumentUrl?: string | null;
}

/** Matches the backend LeaseCancellationResponseDto. */
export interface LeaseCancellationResponse {
  id: string;
  leaseId: string;
  requestId: string | null;
  initiatedBy: string;
  reason: string | null;
  effectiveDate: string;
  moveOutDate: string | null;
  securityDepositRefundAmount: number | null;
  depositDispositionNotes: string | null;
  statusId: number | null; // 1=Draft, 2=Submitted, 3=PendingSignature, 4=TenantSigned, 5=Finalized, 6=Rejected
  statusName: string | null;
  agreementDocumentUrl: string | null;
  signedAgreementDocumentUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** Admin verification remarks (e.g. rejection reason). Requires a backend change — see instructions relayed alongside this change. */
  remarks?: string | null;
  /** UUID of the admin who last verified/rejected this cancellation. Requires a backend change. */
  verifiedBy?: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaseCancellationService {
  private http = inject(HttpClient);
  private get baseUrl() { return `${getApiBaseUrl()}/api/leasecancellation`; }

  // ── Cancellation requests (tenant-initiated) ──────────────────────────

  createRequest(payload: CreateCancellationRequestPayload): Observable<LeaseCancellationRequestResponse> {
    return this.http.post<LeaseCancellationRequestResponse>(`${this.baseUrl}/requests`, payload, WITH_CREDENTIALS);
  }

  getMyRequests(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<LeaseCancellationRequestResponse>> {
    return this.http.get<PagedResult<LeaseCancellationRequestResponse>>(`${this.baseUrl}/requests/my`, {
      ...WITH_CREDENTIALS,
      params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize),
    });
  }

  getReceivedRequests(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<LeaseCancellationRequestResponse>> {
    return this.http.get<PagedResult<LeaseCancellationRequestResponse>>(`${this.baseUrl}/requests/received`, {
      ...WITH_CREDENTIALS,
      params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize),
    });
  }

  acceptRequest(id: string): Observable<LeaseCancellationRequestResponse> {
    return this.http.put<LeaseCancellationRequestResponse>(`${this.baseUrl}/requests/${id}/accept`, {}, WITH_CREDENTIALS);
  }

  rejectRequest(id: string): Observable<LeaseCancellationRequestResponse> {
    return this.http.put<LeaseCancellationRequestResponse>(`${this.baseUrl}/requests/${id}/reject`, {}, WITH_CREDENTIALS);
  }

  // ── Lease cancellations ────────────────────────────────────────────────

  create(payload: CreateLeaseCancellationPayload): Observable<LeaseCancellationResponse> {
    return this.http.post<LeaseCancellationResponse>(this.baseUrl, payload, WITH_CREDENTIALS);
  }

  update(id: string, payload: UpdateLeaseCancellationPayload): Observable<LeaseCancellationResponse> {
    return this.http.put<LeaseCancellationResponse>(`${this.baseUrl}/${id}`, payload, WITH_CREDENTIALS);
  }

  submit(id: string): Observable<LeaseCancellationResponse> {
    return this.http.put<LeaseCancellationResponse>(`${this.baseUrl}/${id}/submit`, {}, WITH_CREDENTIALS);
  }

  getById(id: string): Observable<LeaseCancellationResponse> {
    return this.http.get<LeaseCancellationResponse>(`${this.baseUrl}/${id}`, WITH_CREDENTIALS);
  }

  /**
   * `history=false` (default): cancellation templates awaiting review, oldest first.
   * `history=true`: templates already decided (past Submitted, or Rejected), newest first.
   * NOTE: the `history` param requires a backend change — see instructions relayed alongside this change.
   */
  getPendingTemplates(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    history = false,
  ): Observable<PagedResult<LeaseCancellationResponse>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (history) params = params.set('history', true);
    return this.http.get<PagedResult<LeaseCancellationResponse>>(`${this.baseUrl}/pending-templates`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  verifyTemplate(id: string, approve: boolean): Observable<LeaseCancellationResponse> {
    return this.http.put<LeaseCancellationResponse>(
      `${this.baseUrl}/${id}/verify-template?approve=${approve}`,
      {},
      WITH_CREDENTIALS,
    );
  }

  sign(id: string, signedAgreementDocumentUrl: string): Observable<LeaseCancellationResponse> {
    return this.http.put<LeaseCancellationResponse>(
      `${this.baseUrl}/${id}/sign`,
      { signedAgreementDocumentUrl },
      WITH_CREDENTIALS,
    );
  }

  /**
   * `history=false` (default): signed cancellations awaiting final review, oldest first.
   * `history=true`: signed cancellations already decided (Finalized, or Rejected), newest first.
   * NOTE: the `history` param requires a backend change — see instructions relayed alongside this change.
   */
  getPendingSigned(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    history = false,
  ): Observable<PagedResult<LeaseCancellationResponse>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (history) params = params.set('history', true);
    return this.http.get<PagedResult<LeaseCancellationResponse>>(`${this.baseUrl}/pending-signed`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  verifySigned(id: string, approve: boolean): Observable<LeaseCancellationResponse> {
    return this.http.put<LeaseCancellationResponse>(
      `${this.baseUrl}/${id}/verify-signed?approve=${approve}`,
      {},
      WITH_CREDENTIALS,
    );
  }
}
