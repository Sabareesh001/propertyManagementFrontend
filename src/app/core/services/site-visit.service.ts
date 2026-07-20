import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBaseUrl, WITH_CREDENTIALS } from '../api.config';
import { PropertyDetail } from './property.service';
import { UserResponse } from './auth.service';

export interface SiteVisitRequestDto {
  visitDate: string; // ISO string
}

export interface SiteVisitResponseDto {
  id: string;
  propertyId: number;
  tenantId: string;
  ownerId: string;
  visitDate: string;
  statusId: number;
  statusName: string;
  remarks: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  property: PropertyDetail | null;
  tenant: UserResponse | null;
  owner: UserResponse | null;
}

export interface UpdateSiteVisitStatusDto {
  statusId: number;
  remarks: string | null;
}

@Injectable({ providedIn: 'root' })
export class SiteVisitService {
  private http = inject(HttpClient);
  private get baseUrl() { return `${getApiBaseUrl()}/api/sitevisit`; }

  requestVisit(propertyId: number, dto: SiteVisitRequestDto): Observable<SiteVisitResponseDto> {
    return this.http.post<SiteVisitResponseDto>(`${this.baseUrl}/property/${propertyId}`, dto, WITH_CREDENTIALS);
  }

  updateStatus(visitId: string, dto: UpdateSiteVisitStatusDto): Observable<SiteVisitResponseDto> {
    return this.http.put<SiteVisitResponseDto>(`${this.baseUrl}/${visitId}/status`, dto, WITH_CREDENTIALS);
  }

  cancelVisit(visitId: string, remarks: string): Observable<SiteVisitResponseDto> {
    return this.http.put<SiteVisitResponseDto>(`${this.baseUrl}/${visitId}/cancel`, { remarks }, WITH_CREDENTIALS);
  }

  getMyRequests(): Observable<SiteVisitResponseDto[]> {
    return this.http.get<SiteVisitResponseDto[]>(`${this.baseUrl}/my-requests`, WITH_CREDENTIALS);
  }

  getOwnerRequests(): Observable<SiteVisitResponseDto[]> {
    return this.http.get<SiteVisitResponseDto[]>(`${this.baseUrl}/owner-requests`, WITH_CREDENTIALS);
  }
}
