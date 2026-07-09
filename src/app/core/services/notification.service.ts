import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';
import { PagedResult } from '../models/paged-result.model';

/** Mirrors the backend NotificationType enum. */
export enum NotificationType {
  ProposalSubmitted = 1,
  ProposalApproved = 2,
  ProposalRejected = 3,
  LeaseSubmittedForApproval = 4,
  LeaseTemplateApproved = 5,
  LeaseTemplateRejected = 6,
  LeaseSignedSubmitted = 7,
  LeaseSignedApproved = 8,
  LeaseSignedRejected = 9,
}

/** Matches the backend NotificationDto. */
export interface NotificationDto {
  id: string;
  typeId: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Route prefix to deep-link into when a notification is clicked. Only entity types with a matching detail route are listed. */
const ROUTE_BY_ENTITY_TYPE: Record<string, string> = {
  Lease: '/leases',
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/notification`;
  private hubConnection?: signalR.HubConnection;

  readonly notifications = signal<NotificationDto[]>([]);
  readonly unreadCount = signal(0);

  /** Backfills the bell dropdown on load/reconnect — paginated on the backend, fetched as one larger page since there's no visible pager in the dropdown. */
  loadMyNotifications(): void {
    const params = new HttpParams().set('pageNumber', 1).set('pageSize', 50);
    this.http
      .get<PagedResult<NotificationDto>>(this.baseUrl, { ...WITH_CREDENTIALS, params })
      .subscribe((res) => {
        this.notifications.set(res.items);
        this.unreadCount.set(res.items.filter((n) => !n.isRead).length);
      });
  }

  markAsRead(id: string): void {
    this.http.put(`${this.baseUrl}/${id}/read`, {}, WITH_CREDENTIALS).subscribe(() => {
      this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      this.unreadCount.update((c) => Math.max(0, c - 1));
    });
  }

  routeForNotification(n: NotificationDto): string | null {
    if (!n.relatedEntityType || !n.relatedEntityId) return null;
    const prefix = ROUTE_BY_ENTITY_TYPE[n.relatedEntityType];
    return prefix ? `${prefix}/${n.relatedEntityId}` : null;
  }

  connect(): void {
    if (this.hubConnection) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/notifications`, { withCredentials: true })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('ReceiveNotification', (dto: NotificationDto) => {
      this.notifications.update((list) => [dto, ...list]);
      this.unreadCount.update((c) => c + 1);
    });

    this.hubConnection.onreconnected(() => this.loadMyNotifications());

    this.hubConnection.start().catch((err) => console.error('SignalR connection failed', err));
  }

  disconnect(): void {
    this.hubConnection?.stop();
    this.hubConnection = undefined;
    this.notifications.set([]);
    this.unreadCount.set(0);
  }
}
