import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';

/** One message in a complaint's conversation thread. Matches the backend ComplaintCommentDto. */
export interface ComplaintComment {
  id: string;
  complaintId: string;
  authorId: string | null;
  authorName: string | null;
  /** "Tenant" | "Owner" | "Admin" — who posted, for thread styling. */
  authorRole: string | null;
  message: string;
  createdAt: string | null;
}

/** Matches the backend ComplaintResponseDto. */
export interface ComplaintResponse {
  id: string;
  leaseId: string | null;
  propertyId: number | null;
  /** Convenience field so lists can show a title without a second call. */
  propertyTitle: string | null;
  tenantId: string | null;
  tenantName: string | null;
  ownerId: string | null;
  categoryId: number | null;
  categoryName: string | null;
  priorityId: number | null;
  priorityName: string | null;
  statusId: number | null;
  statusName: string | null;
  subject: string;
  description: string;
  attachmentUrl: string | null;
  /** UUID of the user who filed the complaint. */
  createdBy: string | null;
  resolvedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** Number of thread messages — populated on list responses. */
  commentCount: number;
  /** Full thread — populated on the detail (GET /{id}) response. */
  comments: ComplaintComment[];
}

/** Body for POST /api/complaint. */
export interface CreateComplaintPayload {
  leaseId: string;
  categoryId: number;
  priorityId: number;
  subject: string;
  description: string;
  attachmentUrl?: string | null;
}

/** Body for PUT /api/complaint/{id}/status. */
export interface UpdateComplaintStatusPayload {
  statusId: number;
  /** Optional note recorded alongside the transition (e.g. a resolution summary). */
  note?: string | null;
}

/** Body for POST /api/complaint/{id}/comments. */
export interface AddCommentPayload {
  message: string;
}

/** Complaint categories — mirrors the backend ComplaintCategories table. */
export const COMPLAINT_CATEGORIES: ReadonlyArray<{ id: number; name: string; icon: string }> = [
  { id: 1, name: 'Maintenance', icon: 'pi pi-wrench' },
  { id: 2, name: 'Plumbing', icon: 'pi pi-filter' },
  { id: 3, name: 'Electrical', icon: 'pi pi-bolt' },
  { id: 4, name: 'Appliance', icon: 'pi pi-desktop' },
  { id: 5, name: 'Noise / Neighbours', icon: 'pi pi-volume-up' },
  { id: 6, name: 'Security / Safety', icon: 'pi pi-shield' },
  { id: 7, name: 'Billing / Payment', icon: 'pi pi-wallet' },
  { id: 8, name: 'Other', icon: 'pi pi-tag' },
];

/** Complaint priorities — mirrors the backend ComplaintPriorities table. */
export const COMPLAINT_PRIORITIES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: 'Low' },
  { id: 2, name: 'Medium' },
  { id: 3, name: 'High' },
  { id: 4, name: 'Urgent' },
];

/** Complaint statuses: 1=Open, 2=In Progress, 3=Resolved, 4=Closed, 5=Cancelled. */
export const COMPLAINT_STATUSES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: 'Open' },
  { id: 2, name: 'In Progress' },
  { id: 3, name: 'Resolved' },
  { id: 4, name: 'Closed' },
  { id: 5, name: 'Cancelled' },
];

export function complaintCategoryName(id: number | null): string {
  return COMPLAINT_CATEGORIES.find((c) => c.id === id)?.name ?? 'Other';
}

export function complaintPriorityName(id: number | null): string {
  return COMPLAINT_PRIORITIES.find((p) => p.id === id)?.name ?? 'Unknown';
}

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/complaint`;

  /** POST /api/complaint — tenant files a complaint against one of their leases. */
  create(payload: CreateComplaintPayload): Observable<ComplaintResponse> {
    return this.http.post<ComplaintResponse>(this.baseUrl, payload, WITH_CREDENTIALS);
  }

  /** GET /api/complaint/my — complaints I filed. */
  getMyComplaints(): Observable<ComplaintResponse[]> {
    return this.http.get<ComplaintResponse[]>(`${this.baseUrl}/my`, WITH_CREDENTIALS);
  }

  /** GET /api/complaint/received — complaints filed against my properties (owner). */
  getReceivedComplaints(): Observable<ComplaintResponse[]> {
    return this.http.get<ComplaintResponse[]>(`${this.baseUrl}/received`, WITH_CREDENTIALS);
  }

  /** GET /api/complaint — every complaint in the system (admin). */
  getAllComplaints(): Observable<ComplaintResponse[]> {
    return this.http.get<ComplaintResponse[]>(this.baseUrl, WITH_CREDENTIALS);
  }

  /** GET /api/complaint/{id} — a single complaint with its full comment thread. */
  getById(id: string): Observable<ComplaintResponse> {
    return this.http.get<ComplaintResponse>(`${this.baseUrl}/${id}`, WITH_CREDENTIALS);
  }

  /** PUT /api/complaint/{id}/status — move a complaint through its lifecycle. */
  updateStatus(id: string, payload: UpdateComplaintStatusPayload): Observable<ComplaintResponse> {
    return this.http.put<ComplaintResponse>(
      `${this.baseUrl}/${id}/status`,
      payload,
      WITH_CREDENTIALS,
    );
  }

  /** POST /api/complaint/{id}/comments — add a message to the thread. */
  addComment(id: string, payload: AddCommentPayload): Observable<ComplaintComment> {
    return this.http.post<ComplaintComment>(
      `${this.baseUrl}/${id}/comments`,
      payload,
      WITH_CREDENTIALS,
    );
  }

  /** POST /api/complaint/upload-document — upload an evidence file, returns a permanent URL. */
  uploadDocument(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-document`, form, WITH_CREDENTIALS);
  }
}
