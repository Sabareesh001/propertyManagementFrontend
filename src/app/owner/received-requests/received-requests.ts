import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuModule } from 'primeng/menu';
import { MessageService, ConfirmationService, MenuItem } from 'primeng/api';
import { LeaseProposalService, LeaseProposalResponse } from '../../core/services/lease-proposal.service';
import { LeaseResponse } from '../../core/services/lease.service';
import { CreateLeaseModalComponent } from '../../shared/create-lease-modal/create-lease-modal';

@Component({
  selector: 'app-received-requests',
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
    CreateLeaseModalComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './received-requests.html',
  styleUrl: './received-requests.css',
})
export class ReceivedRequestsComponent implements OnInit {
  private leaseProposalService = inject(LeaseProposalService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  proposals = signal<LeaseProposalResponse[]>([]);
  loading = signal(true);
  error = signal(false);
  actingId = signal<string | null>(null);
  selectedStatus = signal<number | null>(null);

  leaseModalVisible = signal(false);
  leaseProposal = signal<LeaseProposalResponse | null>(null);

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
    this.leaseProposalService.getReceivedRequests(1, 100).subscribe({
      next: (res) => {
        this.proposals.set(res.items);
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

  tenantName(proposal: LeaseProposalResponse): string {
    const t = proposal.tenant;
    if (!t) return 'Unknown tenant';
    return `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || 'Unknown tenant';
  }

  tenantInitials(proposal: LeaseProposalResponse): string {
    const t = proposal.tenant;
    if (!t) return '?';
    const first = t.firstName?.charAt(0) ?? '';
    const last = t.lastName?.charAt(0) ?? '';
    return (first + last).toUpperCase() || '?';
  }

  canReview(statusId: number | null): boolean {
    return statusId === 2;
  }

  canCreateLease(statusId: number | null): boolean {
    return statusId === 3;
  }

  openCreateLease(proposal: LeaseProposalResponse): void {
    this.leaseProposal.set(proposal);
    this.leaseModalVisible.set(true);
  }

  onLeaseCreated(lease: LeaseResponse): void {
    this.leaseModalVisible.set(false);
    this.router.navigate(['/leases', lease.id], { queryParams: { justCreated: '1' } });
  }

  confirmAccept(proposal: LeaseProposalResponse): void {
    this.confirmationService.confirm({
      message: `Accept the rental request from ${this.tenantName(proposal)}?`,
      header: 'Accept Request',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Accept',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => this.doAccept(proposal),
    });
  }

  confirmReject(proposal: LeaseProposalResponse): void {
    this.confirmationService.confirm({
      message: `Reject the rental request from ${this.tenantName(proposal)}?`,
      header: 'Reject Request',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reject',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doReject(proposal),
    });
  }

  private doAccept(proposal: LeaseProposalResponse): void {
    this.actingId.set(proposal.id);
    this.leaseProposalService.accept(proposal.id).subscribe({
      next: (updated) => {
        this.proposals.update(list => list.map(p => p.id === updated.id ? updated : p));
        this.actingId.set(null);
        this.messageService.add({ severity: 'success', summary: 'Accepted', detail: 'The rental request has been accepted.' });
      },
      error: () => {
        this.actingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to accept the request.' });
      },
    });
  }

  private doReject(proposal: LeaseProposalResponse): void {
    this.actingId.set(proposal.id);
    this.leaseProposalService.reject(proposal.id).subscribe({
      next: (updated) => {
        this.proposals.update(list => list.map(p => p.id === updated.id ? updated : p));
        this.actingId.set(null);
        this.messageService.add({ severity: 'success', summary: 'Rejected', detail: 'The rental request has been rejected.' });
      },
      error: () => {
        this.actingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to reject the request.' });
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
