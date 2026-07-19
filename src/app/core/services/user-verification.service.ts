import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, PagedResult } from '../models/paged-result.model';

export type VerificationStatus = 'Unverified' | 'Pending' | 'Verified' | 'Rejected';

export const VERIFICATION_DOCUMENT_TYPES = [{ id: 1, name: 'Pan Card', icon: 'pi pi-id-card' }] as const;

export function verificationDocumentTypeName(id: number): string {
  return VERIFICATION_DOCUMENT_TYPES.find((t) => t.id === id)?.name ?? `Document #${id}`;
}

export interface SubmitVerificationDocument {
  documentTypeId: number;
  documentNumber: string;
  documentUrl: string;
}

export interface UserVerificationDocument {
  id: string;
  documentTypeId: number;
  documentNumber: string;
  documentUrl: string;
}

/** Response of the /api/userverification endpoints (UserVerificationResponseDto). */
export interface UserVerificationResponse {
  id: string;
  userId: string;
  status: VerificationStatus;
  remarks: string | null;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  documents: UserVerificationDocument[];
}

@Injectable({ providedIn: 'root' })
export class UserVerificationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/userverification`;

  /** GET /api/userverification/status — the current user's verification status. */
  getStatus(): Observable<{ status: VerificationStatus }> {
    return this.http.get<{ status: VerificationStatus }>(`${this.baseUrl}/status`, WITH_CREDENTIALS);
  }

  /** POST /api/userverification/submit — submit KYC documents for review. */
  submit(documents: SubmitVerificationDocument[]): Observable<UserVerificationResponse> {
    return this.http.post<UserVerificationResponse>(`${this.baseUrl}/submit`, { documents }, WITH_CREDENTIALS);
  }

  /** POST /api/userverification/upload-document — upload a PDF, returns a permanent URL. */
  uploadDocument(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-document`, form, WITH_CREDENTIALS);
  }

  /**
   * GET /api/userverification/pending — paginated.
   * `history=false` (default): pending requests only, oldest first.
   * `history=true`: already-decided requests (Verified/Rejected), newest first.
   * NOTE: the `history` param requires a backend change — see instructions relayed alongside this change.
   */
  getPending(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    history = false,
  ): Observable<PagedResult<UserVerificationResponse>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (history) params = params.set('history', true);
    return this.http.get<PagedResult<UserVerificationResponse>>(`${this.baseUrl}/pending`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  /** POST /api/userverification/{id}/verify — approve a request (admin). */
  verify(id: string, remarks?: string): Observable<UserVerificationResponse> {
    return this.http.post<UserVerificationResponse>(
      `${this.baseUrl}/${id}/verify`,
      remarks ? { remarks } : {},
      WITH_CREDENTIALS,
    );
  }

  /** POST /api/userverification/{id}/reject — reject a request with remarks (admin). */
  reject(id: string, remarks: string): Observable<UserVerificationResponse> {
    return this.http.post<UserVerificationResponse>(`${this.baseUrl}/${id}/reject`, { remarks }, WITH_CREDENTIALS);
  }
}
