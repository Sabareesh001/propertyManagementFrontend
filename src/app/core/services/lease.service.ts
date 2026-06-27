import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';

/** A document attached to a lease at creation — see DocumentResponseDto. */
export interface LeaseDocumentPayload {
  documentTypeId: number;
  documentNumber: string;
  documentUrl: string;
}

/** Body for POST /api/lease. */
export interface CreateLeasePayload {
  tenantId: string;
  propertyId: number;
  proposalId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number | null;
  upfrontPayment: number | null;
  securityDeposit: number | null;
  agreementDocumentUrl?: string | null;
  documents?: LeaseDocumentPayload[];
}

/** Matches the backend LeaseResponseDto. */
export interface LeaseResponse {
  id: string;
  tenantId: string | null;
  propertyId: number | null;
  proposalId: string;
  startDate: string | null;
  endDate: string | null;
  monthlyRent: number | null;
  upfrontPayment: number | null;
  securityDeposit: number | null;
  statusId: number | null;
  statusName: string | null;
  agreementDocumentUrl: string | null;
  signedAgreementDocumentUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaseService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/lease`;

  /** POST /api/lease — owner creates a lease from an approved proposal. */
  create(payload: CreateLeasePayload): Observable<LeaseResponse> {
    return this.http.post<LeaseResponse>(this.baseUrl, payload, WITH_CREDENTIALS);
  }

  /** GET /api/lease/my-leases — leases where the user is owner or tenant. */
  getMyLeases(): Observable<LeaseResponse[]> {
    return this.http.get<LeaseResponse[]>(`${this.baseUrl}/my-leases`, WITH_CREDENTIALS);
  }

  /** GET /api/lease/{id} — a single lease. */
  getById(id: string): Observable<LeaseResponse> {
    return this.http.get<LeaseResponse>(`${this.baseUrl}/${id}`, WITH_CREDENTIALS);
  }

  /** PUT /api/lease/{id}/submit — owner moves Draft → Submitted. */
  submit(id: string): Observable<LeaseResponse> {
    return this.http.put<LeaseResponse>(`${this.baseUrl}/${id}/submit`, {}, WITH_CREDENTIALS);
  }

  /**
   * POST /api/userverification/upload-document — uploads a PDF (max 10 MB) and returns a
   * permanent URL. Unlike the Owner-only property upload, this endpoint is available to any
   * authenticated user, so the tenant can use it to host their signed agreement before signing.
   */
  uploadDocument(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(
      `${API_BASE_URL}/api/userverification/upload-document`,
      form,
      WITH_CREDENTIALS,
    );
  }

  /** PUT /api/lease/{id}/sign — tenant uploads a signed agreement. */
  sign(id: string, signedAgreementDocumentUrl: string): Observable<LeaseResponse> {
    return this.http.put<LeaseResponse>(
      `${this.baseUrl}/${id}/sign`,
      { signedAgreementDocumentUrl },
      WITH_CREDENTIALS,
    );
  }

  /** GET /api/lease/pending-templates — Admin only: leases in Submitted (2) awaiting template review. */
  getPendingTemplates(): Observable<LeaseResponse[]> {
    return this.http.get<LeaseResponse[]>(`${this.baseUrl}/pending-templates`, WITH_CREDENTIALS);
  }

  /** GET /api/lease/pending-signed — Admin only: leases in TenantSigned (4) awaiting signed-agreement review. */
  getPendingSigned(): Observable<LeaseResponse[]> {
    return this.http.get<LeaseResponse[]>(`${this.baseUrl}/pending-signed`, WITH_CREDENTIALS);
  }

  /** PUT /api/lease/{id}/verify-template?approve=true|false — Admin: Submitted → PendingSignature / Rejected. */
  verifyTemplate(id: string, approve: boolean, remarks?: string): Observable<LeaseResponse> {
    return this.http.put<LeaseResponse>(
      `${this.baseUrl}/${id}/verify-template?approve=${approve}`,
      { remarks: remarks ?? null },
      WITH_CREDENTIALS,
    );
  }

  /** PUT /api/lease/{id}/verify-signed?approve=true|false — Admin: TenantSigned → Active / Rejected. */
  verifySigned(id: string, approve: boolean, remarks?: string): Observable<LeaseResponse> {
    return this.http.put<LeaseResponse>(
      `${this.baseUrl}/${id}/verify-signed?approve=${approve}`,
      { remarks: remarks ?? null },
      WITH_CREDENTIALS,
    );
  }
}
