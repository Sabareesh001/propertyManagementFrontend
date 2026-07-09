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
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { LeaseService, LeaseResponse } from '../core/services/lease.service';
import { SignLeaseModalComponent } from '../shared/sign-lease-modal/sign-lease-modal';
import { selectCurrentUser } from '../store/auth/auth.selectors';

@Component({
  selector: 'app-leases',
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
    SignLeaseModalComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './leases.html',
  styleUrl: './leases.css',
})
export class LeasesComponent implements OnInit {
  private leaseService = inject(LeaseService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private store = inject(Store);
  private router = inject(Router);

  private currentUser = toSignal(this.store.select(selectCurrentUser), { initialValue: null });

  leases = signal<LeaseResponse[]>([]);
  loading = signal(true);
  error = signal(false);
  actingId = signal<string | null>(null);
  selectedStatus = signal<number | null>(null);

  signModalVisible = signal(false);
  signingLease = signal<LeaseResponse | null>(null);

  filteredLeases = computed(() => {
    const status = this.selectedStatus();
    return status === null
      ? this.leases()
      : this.leases().filter(l => l.statusId === status);
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
      { label: 'Pending Signature', value: 3 },
      { label: 'Tenant Signed', value: 4 },
      { label: 'Active', value: 5 },
      { label: 'Rejected', value: 6 },
      { label: 'Terminated', value: 7 },
      { label: 'Expired', value: 8 },
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
    this.leaseService.getMyLeases(1, 100).subscribe({
      next: (res) => {
        this.leases.set(res.items);
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
      case 3: return 'Pending Signature';
      case 4: return 'Tenant Signed';
      case 5: return 'Active';
      case 6: return 'Rejected';
      case 7: return 'Terminated';
      case 8: return 'Expired';
      default: return 'Unknown';
    }
  }

  statusSeverity(statusId: number | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (statusId) {
      case 1: return 'secondary';
      case 2: return 'info';
      case 3: return 'warn';
      case 4: return 'info';
      case 5: return 'success';
      case 6: return 'danger';
      case 7: return 'danger';
      case 8: return 'secondary';
      default: return 'secondary';
    }
  }

  canSubmit(lease: LeaseResponse): boolean {
    return lease.statusId === 1;
  }

  /** The tenant may sign only while the lease awaits signature (PendingSignature). */
  canSign(lease: LeaseResponse): boolean {
    const user = this.currentUser();
    return lease.statusId === 3 && !!user && lease.tenantId === user.id;
  }

  openLease(lease: LeaseResponse): void {
    this.router.navigate(['/leases', lease.id]);
  }

  openSignModal(lease: LeaseResponse): void {
    this.signingLease.set(lease);
    this.signModalVisible.set(true);
  }

  onLeaseSigned(updated: LeaseResponse): void {
    this.leases.update(list => list.map(l => l.id === updated.id ? updated : l));
    this.messageService.add({
      severity: 'success',
      summary: 'Lease Signed',
      detail: 'Your signed agreement has been submitted for admin review.',
    });
  }

  confirmSubmit(lease: LeaseResponse): void {
    if (!lease.agreementDocumentUrl) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Agreement Required',
        detail: 'Attach an agreement document to this lease before submitting it for review.',
      });
      return;
    }
    this.confirmationService.confirm({
      message: 'Submit this lease for admin review? You won\'t be able to edit it afterwards.',
      header: 'Submit Lease',
      icon: 'pi pi-send',
      acceptLabel: 'Submit',
      accept: () => this.doSubmit(lease),
    });
  }

  private doSubmit(lease: LeaseResponse): void {
    this.actingId.set(lease.id);
    this.leaseService.submit(lease.id).subscribe({
      next: (updated) => {
        this.leases.update(list => list.map(l => l.id === updated.id ? updated : l));
        this.actingId.set(null);
        this.messageService.add({ severity: 'success', summary: 'Submitted', detail: 'The lease has been submitted for review.' });
      },
      error: () => {
        this.actingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to submit the lease.' });
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
