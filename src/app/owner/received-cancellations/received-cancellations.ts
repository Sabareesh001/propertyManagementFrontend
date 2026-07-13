import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService, ConfirmationService } from 'primeng/api';
import { LeaseCancellationService, LeaseCancellationRequestResponse } from '../../core/services/lease-cancellation.service';
import { extractApiError } from '../../core/api.config';

@Component({
  selector: 'app-received-cancellations',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TagModule, ToastModule, ConfirmDialogModule, ProgressSpinnerModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './received-cancellations.html',
  styleUrl: './received-cancellations.css',
})
export class ReceivedCancellationsComponent implements OnInit {
  private cancellationService = inject(LeaseCancellationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  requests = signal<LeaseCancellationRequestResponse[]>([]);
  loading = signal(true);
  error = signal(false);
  actingId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.cancellationService.getReceivedRequests(1, 100).subscribe({
      next: (res) => {
        this.requests.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  canReview(statusId: number): boolean {
    return statusId === 1;
  }

  statusLabel(statusId: number): string {
    switch (statusId) {
      case 1: return 'Submitted';
      case 2: return 'Accepted';
      case 3: return 'Rejected';
      case 4: return 'Withdrawn';
      default: return 'Unknown';
    }
  }

  statusSeverity(statusId: number): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (statusId) {
      case 1: return 'info';
      case 2: return 'success';
      case 3: return 'danger';
      case 4: return 'secondary';
      default: return 'secondary';
    }
  }

  confirmAccept(request: LeaseCancellationRequestResponse): void {
    this.confirmationService.confirm({
      message: 'Accept this cancellation request? A draft cancellation agreement will be created for you to complete.',
      header: 'Accept Request',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Accept',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => this.doAccept(request),
    });
  }

  confirmReject(request: LeaseCancellationRequestResponse): void {
    this.confirmationService.confirm({
      message: 'Reject this cancellation request? The tenant will be notified.',
      header: 'Reject Request',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reject',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doReject(request),
    });
  }

  private doAccept(request: LeaseCancellationRequestResponse): void {
    this.actingId.set(request.id);
    this.cancellationService.acceptRequest(request.id).subscribe({
      next: (updated) => {
        this.requests.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.actingId.set(null);
        this.messageService.add({ severity: 'success', summary: 'Accepted', detail: 'Continue by completing the cancellation agreement.' });
        if (updated.leaseCancellationId) {
          this.router.navigate(['/cancellations', updated.leaseCancellationId]);
        }
      },
      error: (err) => {
        this.actingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: extractApiError(err, 'Failed to accept the request.') });
      },
    });
  }

  private doReject(request: LeaseCancellationRequestResponse): void {
    this.actingId.set(request.id);
    this.cancellationService.rejectRequest(request.id).subscribe({
      next: (updated) => {
        this.requests.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.actingId.set(null);
        this.messageService.add({ severity: 'success', summary: 'Rejected', detail: 'The cancellation request has been rejected.' });
      },
      error: (err) => {
        this.actingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: extractApiError(err, 'Failed to reject the request.') });
      },
    });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  }
}
