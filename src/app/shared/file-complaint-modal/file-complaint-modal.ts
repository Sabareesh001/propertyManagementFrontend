import { Component, Input, Output, EventEmitter, inject, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ComplaintService,
  ComplaintResponse,
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
} from '../../core/services/complaint.service';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';
import { selectCurrentUser } from '../../store/auth/auth.selectors';
import { extractApiError } from '../../core/api.config';

/** A tenant-side lease presented in the "which property?" picker. */
interface LeaseOption {
  id: string;
  label: string;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

@Component({
  selector: 'app-file-complaint-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './file-complaint-modal.html',
  styleUrl: './file-complaint-modal.css',
})
export class FileComplaintModalComponent implements OnChanges {
  @Input() visible = false;
  /** When set, the lease picker is pre-selected and hidden (e.g. filing from a lease page). */
  @Input() presetLeaseId: string | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<ComplaintResponse>();

  private complaintService = inject(ComplaintService);
  private leaseService = inject(LeaseService);
  private store = inject(Store);
  private currentUser = toSignal(this.store.select(selectCurrentUser), { initialValue: null });

  categories = [...COMPLAINT_CATEGORIES];
  priorities = [...COMPLAINT_PRIORITIES];

  leaseOptions = signal<LeaseOption[]>([]);
  loadingLeases = signal(false);

  leaseId: string | null = null;
  categoryId: number | null = null;
  priorityId: number | null = 2; // default: Medium
  subject = '';
  description = '';
  attachmentUrl = signal<string | null>(null);
  uploading = signal(false);
  fileError = signal<string | null>(null);

  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  /** When a lease is preset (e.g. filing from a lease page), the picker is hidden. */
  hidePicker(): boolean {
    return !!this.presetLeaseId;
  }

  ngOnChanges(): void {
    if (this.visible) {
      this.leaseId = this.presetLeaseId;
      this.categoryId = null;
      this.priorityId = 2;
      this.subject = '';
      this.description = '';
      this.attachmentUrl.set(null);
      this.fileError.set(null);
      this.uploading.set(false);
      this.errorMessage.set(null);
      this.submitting.set(false);
      if (!this.presetLeaseId) {
        this.loadLeases();
      }
    }
  }

  private loadLeases(): void {
    this.loadingLeases.set(true);
    this.leaseService.getMyLeases().subscribe({
      next: (leases) => {
        const myId = this.currentUser()?.id;
        const options = leases
          .filter((l) => l.tenantId === myId && l.statusId === 5) // Active leases where I'm the tenant
          .map((l) => ({ id: l.id, label: this.leaseLabel(l) }));
        this.leaseOptions.set(options);
        this.loadingLeases.set(false);
      },
      error: () => {
        this.leaseOptions.set([]);
        this.loadingLeases.set(false);
      },
    });
  }

  private leaseLabel(lease: LeaseResponse): string {
    const range = `${this.shortDate(lease.startDate)} – ${this.shortDate(lease.endDate)}`;
    return `Property #${lease.propertyId} · ${range}`;
  }

  private shortDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(iso));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      this.fileError.set('Only PDF or image files are allowed.');
      input.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.fileError.set('File exceeds the 10 MB limit.');
      input.value = '';
      return;
    }

    this.fileError.set(null);
    this.uploading.set(true);
    this.complaintService.uploadDocument(file).subscribe({
      next: ({ url }) => {
        this.attachmentUrl.set(url);
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.fileError.set(extractApiError(err, 'Failed to upload the file.'));
        input.value = '';
      },
    });
  }

  clearAttachment(): void {
    this.attachmentUrl.set(null);
  }

  get canSubmit(): boolean {
    return (
      !!this.leaseId &&
      this.categoryId !== null &&
      this.priorityId !== null &&
      this.subject.trim().length >= 5 &&
      this.description.trim().length >= 10 &&
      !this.uploading() &&
      !this.submitting()
    );
  }

  close(): void {
    if (this.submitting()) return;
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (!this.canSubmit || !this.leaseId) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.complaintService
      .create({
        leaseId: this.leaseId,
        categoryId: this.categoryId!,
        priorityId: this.priorityId!,
        subject: this.subject.trim(),
        description: this.description.trim(),
        attachmentUrl: this.attachmentUrl(),
      })
      .subscribe({
        next: (complaint) => {
          this.submitting.set(false);
          this.created.emit(complaint);
          this.visibleChange.emit(false);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(extractApiError(err, 'Failed to file the complaint.'));
        },
      });
  }
}
