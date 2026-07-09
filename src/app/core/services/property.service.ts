import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';

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

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/property`;

  /** GET /api/property — all properties (public). */
  getAll(): Observable<PropertyDetail[]> {
    return this.http.get<PropertyDetail[]>(this.baseUrl);
  }

  /** GET /api/property/{id} — single property (public). */
  getById(id: number): Observable<PropertyDetail> {
    return this.http.get<PropertyDetail>(`${this.baseUrl}/${id}`,WITH_CREDENTIALS);
  }

  /** GET /api/property/my — the authenticated owner's properties. */
  getMyProperties(): Observable<PropertyDetail[]> {
    return this.http.get<PropertyDetail[]>(`${this.baseUrl}/my`, WITH_CREDENTIALS);
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

  /** GET /api/property/{id}/documents — get all documents for a property. */
  getDocuments(id: number): Observable<PropertyDocument[]> {
    return this.http.get<PropertyDocument[]>(`${this.baseUrl}/${id}/documents`, WITH_CREDENTIALS);
  }

  /** POST /api/property/{id}/documents — attach a document to a property. */
  addDocument(id: number, payload: AddPropertyDocumentPayload): Observable<PropertyDocument> {
    return this.http.post<PropertyDocument>(`${this.baseUrl}/${id}/documents`, payload, WITH_CREDENTIALS);
  }

  /** DELETE /api/property/{id}/documents/{documentId} — remove a document. */
  removeDocument(propertyId: number, documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${propertyId}/documents/${documentId}`, WITH_CREDENTIALS);
  }

  /** GET /api/property/pending-verification — Admin only. */
  getPendingVerification(): Observable<PropertyDetail[]> {
    return this.http.get<PropertyDetail[]>(`${this.baseUrl}/pending-verification`, WITH_CREDENTIALS);
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
