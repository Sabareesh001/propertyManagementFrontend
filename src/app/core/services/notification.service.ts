import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { getApiBaseUrl, WITH_CREDENTIALS } from '../api.config';
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
  CancellationRequestSubmitted = 10,
  CancellationRequestAccepted = 11,
  CancellationRequestRejected = 12,
  LeaseCancellationSubmittedForApproval = 13,
  LeaseCancellationTemplateApproved = 14,
  LeaseCancellationTemplateRejected = 15,
  LeaseCancellationSignedSubmitted = 16,
  LeaseCancellationFinalized = 17,
  LeaseCancellationRejected = 18,
  LeaseExpired = 19,
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

/**
 * Deep-link destination per NotificationType, keyed to this app's actual routes.
 * - `list` routes ignore relatedEntityId (no detail page exists, e.g. proposal inbox/admin queues).
 * - `detail` routes append relatedEntityId to the given prefix; falls back to the list page if the id is missing.
 */
type NotificationRoute = { kind: 'list'; path: string } | { kind: 'detail'; prefix: string };

const ROUTE_BY_NOTIFICATION_TYPE: Record<NotificationType, NotificationRoute> = {
  [NotificationType.ProposalSubmitted]: { kind: 'list', path: '/owner/received-requests' },
  [NotificationType.ProposalApproved]: { kind: 'list', path: '/my-requests' },
  [NotificationType.ProposalRejected]: { kind: 'list', path: '/my-requests' },
  [NotificationType.LeaseSubmittedForApproval]: { kind: 'list', path: '/admin/verifications/lease' },
  [NotificationType.LeaseTemplateApproved]: { kind: 'detail', prefix: '/leases' },
  [NotificationType.LeaseTemplateRejected]: { kind: 'detail', prefix: '/leases' },
  [NotificationType.LeaseSignedSubmitted]: { kind: 'list', path: '/admin/verifications/signed-lease' },
  [NotificationType.LeaseSignedApproved]: { kind: 'detail', prefix: '/leases' },
  [NotificationType.LeaseSignedRejected]: { kind: 'detail', prefix: '/leases' },
  [NotificationType.CancellationRequestSubmitted]: { kind: 'list', path: '/owner/cancellations/requests' },
  [NotificationType.CancellationRequestAccepted]: { kind: 'detail', prefix: '/cancellations' },
  [NotificationType.CancellationRequestRejected]: { kind: 'detail', prefix: '/cancellations' },
  [NotificationType.LeaseCancellationSubmittedForApproval]: { kind: 'list', path: '/admin/verifications/cancellation-template' },
  [NotificationType.LeaseCancellationTemplateApproved]: { kind: 'detail', prefix: '/cancellations' },
  [NotificationType.LeaseCancellationTemplateRejected]: { kind: 'detail', prefix: '/cancellations' },
  [NotificationType.LeaseCancellationSignedSubmitted]: { kind: 'list', path: '/admin/verifications/cancellation-signed' },
  [NotificationType.LeaseCancellationFinalized]: { kind: 'detail', prefix: '/cancellations' },
  [NotificationType.LeaseCancellationRejected]: { kind: 'detail', prefix: '/cancellations' },
  [NotificationType.LeaseExpired]: { kind: 'detail', prefix: '/leases' },
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private get baseUrl() { return `${getApiBaseUrl()}/api/notification`; }
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
    const route = ROUTE_BY_NOTIFICATION_TYPE[n.typeId];
    if (!route) return null;
    if (route.kind === 'list') return route.path;
    return n.relatedEntityId ? `${route.prefix}/${n.relatedEntityId}` : route.prefix;
  }

  connect(): void {
    if (this.hubConnection) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${getApiBaseUrl()}/hubs/notifications`, { withCredentials: true })
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
