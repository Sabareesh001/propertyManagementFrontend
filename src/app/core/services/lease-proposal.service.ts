import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBaseUrl, WITH_CREDENTIALS } from '../api.config';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, PagedResult } from '../models/paged-result.model';

export interface CreateLeaseProposalPayload {
  propertyId: number;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  upfrontPayment: number;
  securityDeposit: number;
}

export interface TenantDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  occupation: string | null;
  monthlyIncome: number | null;
}

export interface LeaseProposalResponse {
  id: string;
  propertyId: number | null;
  tenantId: string | null;
  statusId: number | null;
  startDate: string | null;
  endDate: string | null;
  monthlyRent: number | null;
  upfrontPayment: number | null;
  securityDeposit: number | null;
  tenant: TenantDetails | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaseProposalService {
  private http = inject(HttpClient);
  private get baseUrl() { return `${getApiBaseUrl()}/api/leaseproposal`; }

  create(payload: CreateLeaseProposalPayload): Observable<LeaseProposalResponse> {
    return this.http.post<LeaseProposalResponse>(this.baseUrl, payload, WITH_CREDENTIALS);
  }

  submit(id: string): Observable<LeaseProposalResponse> {
    return this.http.post<LeaseProposalResponse>(`${this.baseUrl}/${id}/submit`, {}, WITH_CREDENTIALS);
  }

  getMyRequests(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<LeaseProposalResponse>> {
    return this.http.get<PagedResult<LeaseProposalResponse>>(`${this.baseUrl}/my-requests`, {
      ...WITH_CREDENTIALS,
      params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize),
    });
  }

  getReceivedRequests(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<LeaseProposalResponse>> {
    return this.http.get<PagedResult<LeaseProposalResponse>>(`${this.baseUrl}/received-requests`, {
      ...WITH_CREDENTIALS,
      params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize),
    });
  }

  accept(id: string): Observable<LeaseProposalResponse> {
    return this.http.put<LeaseProposalResponse>(`${this.baseUrl}/${id}/accept`, {}, WITH_CREDENTIALS);
  }

  reject(id: string): Observable<LeaseProposalResponse> {
    return this.http.put<LeaseProposalResponse>(`${this.baseUrl}/${id}/reject`, {}, WITH_CREDENTIALS);
  }

  cancel(id: string): Observable<LeaseProposalResponse> {
    return this.http.put<LeaseProposalResponse>(`${this.baseUrl}/${id}/cancel`, {}, WITH_CREDENTIALS);
  }
}
