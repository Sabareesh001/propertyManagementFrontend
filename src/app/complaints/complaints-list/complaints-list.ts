import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuModule } from 'primeng/menu';
import { MessageService, MenuItem } from 'primeng/api';
import {
  ComplaintService,
  ComplaintResponse,
  complaintCategoryName,
} from '../../core/services/complaint.service';
import { FileComplaintModalComponent } from '../../shared/file-complaint-modal/file-complaint-modal';

type ComplaintScope = 'mine' | 'received' | 'all';

@Component({
  selector: 'app-complaints-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ProgressSpinnerModule,
    MenuModule,
    FileComplaintModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './complaints-list.html',
  styleUrl: './complaints-list.css',
})
export class ComplaintsListComponent implements OnInit {
  private complaintService = inject(ComplaintService);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  scope: ComplaintScope = 'mine';

  complaints = signal<ComplaintResponse[]>([]);
  loading = signal(true);
  error = signal(false);
  selectedStatus = signal<number | null>(null);
  fileModalVisible = signal(false);

  categoryName = complaintCategoryName;

  filteredComplaints = computed(() => {
    const status = this.selectedStatus();
    return status === null
      ? this.complaints()
      : this.complaints().filter((c) => c.statusId === status);
  });

  /** Count of not-yet-closed complaints — a small header stat. */
  openCount = computed(() =>
    this.complaints().filter((c) => c.statusId === 1 || c.statusId === 2).length,
  );

  selectedStatusLabel = computed(() =>
    this.selectedStatus() === null ? 'All Statuses' : this.statusLabel(this.selectedStatus()),
  );

  filterMenuItems = computed<MenuItem[]>(() => {
    const current = this.selectedStatus();
    const options: Array<{ label: string; value: number | null }> = [
      { label: 'All', value: null },
      { label: 'Open', value: 1 },
      { label: 'In Progress', value: 2 },
      { label: 'Resolved', value: 3 },
      { label: 'Closed', value: 4 },
      { label: 'Cancelled', value: 5 },
    ];
    return options.map((o) => ({
      label: o.label,
      icon: current === o.value ? 'pi pi-check' : undefined,
      command: () => this.selectedStatus.set(o.value),
    }));
  });

  get pageTitle(): string {
    switch (this.scope) {
      case 'received': return 'Property Complaints';
      case 'all': return 'All Complaints';
      default: return 'My Complaints';
    }
  }

  /** Only tenants filing their own complaints get the "File a Complaint" action. */
  canFile(): boolean {
    return this.scope === 'mine';
  }

  /** The tenant column is meaningful only when viewing complaints from others. */
  showTenant(): boolean {
    return this.scope !== 'mine';
  }

  get emptyText(): string {
    switch (this.scope) {
      case 'received': return 'No complaints have been filed against your properties.';
      case 'all': return 'There are no complaints in the system yet.';
      default: return "You haven't filed any complaints yet.";
    }
  }

  ngOnInit(): void {
    this.scope = (this.route.snapshot.data['scope'] as ComplaintScope) ?? 'mine';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const source$ =
      this.scope === 'received'
        ? this.complaintService.getReceivedComplaints()
        : this.scope === 'all'
          ? this.complaintService.getAllComplaints()
          : this.complaintService.getMyComplaints();

    source$.subscribe({
      next: (data) => {
        this.complaints.set(this.sort(data));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private sort(list: ComplaintResponse[]): ComplaintResponse[] {
    return [...list].sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
        new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
    );
  }

  onCreated(complaint: ComplaintResponse): void {
    this.complaints.update((list) => this.sort([complaint, ...list]));
    this.messageService.add({
      severity: 'success',
      summary: 'Complaint Filed',
      detail: 'Your complaint has been submitted. The owner will be notified.',
    });
  }

  statusLabel(statusId: number | null): string {
    switch (statusId) {
      case 1: return 'Open';
      case 2: return 'In Progress';
      case 3: return 'Resolved';
      case 4: return 'Closed';
      case 5: return 'Cancelled';
      default: return 'Unknown';
    }
  }

  statusSeverity(statusId: number | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (statusId) {
      case 1: return 'info';
      case 2: return 'warn';
      case 3: return 'success';
      case 4: return 'secondary';
      case 5: return 'danger';
      default: return 'secondary';
    }
  }

  priorityLabel(priorityId: number | null): string {
    switch (priorityId) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Urgent';
      default: return 'Unknown';
    }
  }

  prioritySeverity(priorityId: number | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (priorityId) {
      case 1: return 'secondary';
      case 2: return 'info';
      case 3: return 'warn';
      case 4: return 'danger';
      default: return 'secondary';
    }
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  }
}
