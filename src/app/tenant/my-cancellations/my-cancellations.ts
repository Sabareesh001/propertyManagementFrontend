import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LeaseCancellationService, LeaseCancellationRequestResponse } from '../../core/services/lease-cancellation.service';

@Component({
  selector: 'app-my-cancellations',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TagModule, ProgressSpinnerModule],
  templateUrl: './my-cancellations.html',
  styleUrl: './my-cancellations.css',
})
export class MyCancellationsComponent implements OnInit {
  private cancellationService = inject(LeaseCancellationService);

  requests = signal<LeaseCancellationRequestResponse[]>([]);
  loading = signal(true);
  error = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.cancellationService.getMyRequests(1, 100).subscribe({
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

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  }
}
