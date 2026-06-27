import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuModule } from 'primeng/menu';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { LeaseProposalService, LeaseProposalResponse } from '../../core/services/lease-proposal.service';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    MenuModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './my-requests.html',
  styleUrl: './my-requests.css',
})
export class MyRequestsComponent implements OnInit {
  private leaseProposalService = inject(LeaseProposalService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  proposals = signal<LeaseProposalResponse[]>([]);
  loading = signal(true);
  error = signal(false);
  cancellingId = signal<string | null>(null);
  selectedStatus = signal<number | null>(null);

  filteredProposals = computed(() => {
    const status = this.selectedStatus();
    return status === null
      ? this.proposals()
      : this.proposals().filter(p => p.statusId === status);
  });

  selectedStatusLabel = computed(() =>
    this.selectedStatus() === null ? 'All Statuses' : this.statusLabel(this.selectedStatus()),
  );

  filterMenuItems = computed<MenuItem[]>(() => {
    const current = this.selectedStatus();
    const options: Array<{ label: string; value: number | null }> = [
      { label: 'All', value: null },
      { label: 'Draft', value: 1 },
      { label: 'Submitted', value: 2 },
      { label: 'Approved', value: 3 },
      { label: 'Rejected', value: 4 },
      { label: 'Expired', value: 5 },
      { label: 'Cancelled', value: 6 },
    ];
    return options.map(o => ({
      label: o.label,
      icon: current === o.value ? 'pi pi-check' : undefined,
      command: () => this.selectedStatus.set(o.value),
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.leaseProposalService.getMyRequests().subscribe({
      next: (data) => {
        this.proposals.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  statusLabel(statusId: number | null): string {
    switch (statusId) {
      case 1: return 'Draft';
      case 2: return 'Submitted';
      case 3: return 'Approved';
      case 4: return 'Rejected';
      case 5: return 'Expired';
      case 6: return 'Cancelled';
      default: return 'Unknown';
    }
  }

  statusSeverity(statusId: number | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (statusId) {
      case 1: return 'secondary';
      case 2: return 'info';
      case 3: return 'success';
      case 4: return 'danger';
      case 5: return 'warn';
      case 6: return 'secondary';
      default: return 'secondary';
    }
  }

  canCancel(statusId: number | null): boolean {
    return statusId === 1 || statusId === 2;
  }

  confirmCancel(proposal: LeaseProposalResponse): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel this proposal?',
      header: 'Cancel Proposal',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doCancel(proposal),
    });
  }

  private doCancel(proposal: LeaseProposalResponse): void {
    this.cancellingId.set(proposal.id);
    this.leaseProposalService.cancel(proposal.id).subscribe({
      next: (updated) => {
        this.proposals.update(list => list.map(p => p.id === updated.id ? updated : p));
        this.cancellingId.set(null);
        this.messageService.add({ severity: 'success', summary: 'Cancelled', detail: 'Your proposal has been cancelled.' });
      },
      error: () => {
        this.cancellingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to cancel the proposal.' });
      },
    });
  }

  formatCurrency(value: number | null): string {
    if (value === null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  }
}
