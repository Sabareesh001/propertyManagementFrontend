import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, PagedResult } from '../models/paged-result.model';

export interface PropertyImage {
  id: string;
  imageUrl: string;
  description: string | null;
  displayOrder: number;
}

export interface Property {
  id: number;
  ownerId: string;
  title: string;
  description: string | null;
  addressLine: string;
  cityId: number | null;
  monthlyRent: number;
  upfrontPayment: number;
  securityDeposit: number;
  thumbnailImgUrl: string | null;
  verificationStatusId: number | null;
  availabilityStatusId: number | null;
  createdAt: string | null;
  propertyImages: PropertyImage[];
  remarks?: string | null;
}

/** A property-level document (deed, etc.) — see DocumentResponseDto. */
export interface PropertyDocument {
  id: string;
  documentTypeId: number | null;
  documentNumber: string | null;
  documentUrl: string | null;
}

/** Body for POST /api/property/{id}/documents. */
export interface AddPropertyDocumentPayload {
  documentTypeId: number;
  documentNumber: string;
  documentUrl: string;
}

/** Matches the backend PropertyResponseDto. */
export interface PropertyDetail extends Property {
  remarks: string | null;
  verifiedBy: string | null;
  documents?: PropertyDocument[];
  visitPreferences?: string | null;
  specificVisitDays?: string | null;
  visitStartTime?: string | null;
  visitEndTime?: string | null;
}

/** A single image in a create/update payload. Omit/null `id` to add a new image. */
export interface PropertyImagePayload {
  id?: string | null;
  imageUrl: string;
  description: string | null;
  displayOrder: number;
}

/** Body for POST /api/property and PUT /api/property/{id}. */
export interface PropertyPayload {
  title: string;
  description: string | null;
  addressLine: string;
  cityId: number | null;
  monthlyRent: number;
  upfrontPayment: number;
  securityDeposit: number;
  thumbnailImgUrl: string | null;
  propertyImages: PropertyImagePayload[];
  visitPreferences?: string | null;
  specificVisitDays?: string | null;
  visitStartTime?: string | null;
  visitEndTime?: string | null;
}

export interface UpdatePropertyVisitPreferencesPayload {
  visitPreferences?: string | null;
  specificVisitDays?: string | null;
  visitStartTime?: string | null;
  visitEndTime?: string | null;
}

/** Optional filters for GET /api/property — combine with AND semantics. */
export interface PropertyFilters {
  search?: string | null;
  cityIds?: number[];
  minRent?: number | null;
  maxRent?: number | null;
  availabilityStatusId?: number | null;
  sortField?: string | null; // 'monthlyRent' | 'upfrontPayment' | 'securityDeposit'
  sortOrder?: number | null; // 1 asc, -1 desc
}

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/property`;

  /** GET /api/property — all properties (public), paginated, with optional filters. */
  getAll(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    filters?: PropertyFilters,
  ): Observable<PagedResult<PropertyDetail>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.minRent != null) params = params.set('minRent', filters.minRent);
    if (filters?.maxRent != null) params = params.set('maxRent', filters.maxRent);
    if (filters?.availabilityStatusId != null) {
      params = params.set('availabilityStatusId', filters.availabilityStatusId);
    }
    filters?.cityIds?.forEach((id) => {
      params = params.append('cityId', id);
    });
    if (filters?.sortField) params = params.set('sortField', filters.sortField);
    if (filters?.sortOrder != null) params = params.set('sortOrder', filters.sortOrder);
    return this.http.get<PagedResult<PropertyDetail>>(this.baseUrl, { params });
  }

  /** GET /api/property/{id} — single property (public). */
  getById(id: number): Observable<PropertyDetail> {
    return this.http.get<PropertyDetail>(`${this.baseUrl}/${id}`,WITH_CREDENTIALS);
  }

  /** GET /api/property/my — the authenticated owner's properties, paginated. */
  getMyProperties(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Observable<PagedResult<PropertyDetail>> {
    return this.http.get<PagedResult<PropertyDetail>>(`${this.baseUrl}/my`, {
      ...WITH_CREDENTIALS,
      params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize),
    });
  }

  /** POST /api/property — create a property (Owner, Verified). */
  create(payload: PropertyPayload): Observable<PropertyDetail> {
    return this.http.post<PropertyDetail>(this.baseUrl, payload, WITH_CREDENTIALS);
  }

  /** PUT /api/property/{id} — update a property (owner only). */
  update(id: number, payload: PropertyPayload): Observable<PropertyDetail> {
    return this.http.put<PropertyDetail>(`${this.baseUrl}/${id}`, payload, WITH_CREDENTIALS);
  }

  /** PATCH /api/property/{id}/visit-preferences — update property availability (owner only). */
  updateVisitPreferences(id: number, payload: UpdatePropertyVisitPreferencesPayload): Observable<PropertyDetail> {
    return this.http.patch<PropertyDetail>(`${this.baseUrl}/${id}/visit-preferences`, payload, WITH_CREDENTIALS);
  }

  /** DELETE /api/property/{id} — remove a property (owner only). */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, WITH_CREDENTIALS);
  }

  /** PUT /api/property/{id}/submit — move Draft/Rejected → Submitted. */
  submitForVerification(id: number): Observable<PropertyDetail> {
    return this.http.put<PropertyDetail>(`${this.baseUrl}/${id}/submit`, {}, WITH_CREDENTIALS);
  }

  /**
   * POST /api/property/upload-image — upload one or more image files.
   * Returns permanent URLs (in the same order the files were appended).
   */
  uploadImages(files: File[]): Observable<{ urls: string[] }> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return this.http.post<{ urls: string[] }>(`${this.baseUrl}/upload-image`, form, WITH_CREDENTIALS);
  }

  /** POST /api/property/upload-document — upload a PDF, returns a permanent URL. */
  uploadDocument(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-document`, form, WITH_CREDENTIALS);
  }

  /** GET /api/property/{id}/documents — get all documents for a property, paginated. */
  getDocuments(
    id: number,
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = 100,
  ): Observable<PagedResult<PropertyDocument>> {
    return this.http.get<PagedResult<PropertyDocument>>(`${this.baseUrl}/${id}/documents`, {
      ...WITH_CREDENTIALS,
      params: new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize),
    });
  }

  /** POST /api/property/{id}/documents — attach a document to a property. */
  addDocument(id: number, payload: AddPropertyDocumentPayload): Observable<PropertyDocument> {
    return this.http.post<PropertyDocument>(`${this.baseUrl}/${id}/documents`, payload, WITH_CREDENTIALS);
  }

  /** DELETE /api/property/{id}/documents/{documentId} — remove a document. */
  removeDocument(propertyId: number, documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${propertyId}/documents/${documentId}`, WITH_CREDENTIALS);
  }

  /**
   * GET /api/property/pending-verification — Admin only, paginated.
   * `history=false` (default): Submitted properties awaiting review, oldest first.
   * `history=true`: already-decided properties (Verified/Rejected), newest first.
   * NOTE: the `history` param requires a backend change — see instructions relayed alongside this change.
   */
  getPendingVerification(
    pageNumber = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    history = false,
  ): Observable<PagedResult<PropertyDetail>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (history) params = params.set('history', true);
    return this.http.get<PagedResult<PropertyDetail>>(`${this.baseUrl}/pending-verification`, {
      ...WITH_CREDENTIALS,
      params,
    });
  }

  /** PUT /api/property/{id}/verify?approve=true|false — Admin only. */
  verifyProperty(id: number, approve: boolean, remarks?: string): Observable<PropertyDetail> {
    return this.http.put<PropertyDetail>(
      `${this.baseUrl}/${id}/verify?approve=${approve}`,
      { remarks: remarks ?? null },
      WITH_CREDENTIALS,
    );
  }
}
