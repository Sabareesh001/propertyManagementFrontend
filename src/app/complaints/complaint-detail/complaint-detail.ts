import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ComplaintService,
  ComplaintResponse,
  ComplaintComment,
  complaintCategoryName,
} from '../../core/services/complaint.service';
import { selectCurrentUser, selectIsAdmin } from '../../store/auth/auth.selectors';
import { extractApiError } from '../../core/api.config';
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';

/** A queued status transition awaiting confirmation (with an optional note). */
interface PendingStatus {
  statusId: number;
  title: string;
  confirmLabel: string;
  noteLabel: string;
  notePlaceholder: string;
}

@Component({
  selector: 'app-complaint-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ProgressSpinnerModule,
    DialogModule,
    TextareaModule,
    MessageModule,
    SafeUrlPipe,
  ],
  providers: [MessageService],
  templateUrl: './complaint-detail.html',
  styleUrl: './complaint-detail.css',
})
export class ComplaintDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private complaintService = inject(ComplaintService);
  private messageService = inject(MessageService);
  private store = inject(Store);

  private currentUser = toSignal(this.store.select(selectCurrentUser), { initialValue: null });
  isAdmin = toSignal(this.store.select(selectIsAdmin), { initialValue: false });

  categoryName = complaintCategoryName;

  complaintId = '';
  complaint = signal<ComplaintResponse | null>(null);
  loading = signal(true);
  error = signal(false);

  // Comment composer
  newComment = '';
  postingComment = signal(false);
  commentError = signal<string | null>(null);

  // Status-change dialog
  pending = signal<PendingStatus | null>(null);
  statusNote = '';
  updatingStatus = signal(false);
  statusError = signal<string | null>(null);

  /** The signed-in user filed this complaint. */
  isFiler = computed(() => {
    const user = this.currentUser();
    const c = this.complaint();
    return !!user && !!c && c.createdBy === user.id;
  });

  /** The signed-in user owns the property this complaint is about. */
  isOwner = computed(() => {
    const user = this.currentUser();
    const c = this.complaint();
    return !!user && !!c && c.ownerId === user.id;
  });

  /** Anyone who can act on this complaint's staff side. */
  isHandler = computed(() => this.isOwner() || this.isAdmin());

  statusId = computed(() => this.complaint()?.statusId ?? null);

  /** Open (1) or In Progress (2) — the actionable states. */
  private isActionable = computed(() => this.statusId() === 1 || this.statusId() === 2);

  canComment = computed(() => {
    const s = this.statusId();
    const canView = this.isFiler() || this.isHandler();
    return canView && s !== 4 && s !== 5; // not Closed / Cancelled
  });

  // Handler actions
  canStartWork = computed(() => this.isHandler() && this.statusId() === 1);
  canResolve = computed(() => this.isHandler() && this.isActionable());
  // Filer actions
  canCancel = computed(() => this.isFiler() && this.isActionable());
  canClose = computed(() => this.isFiler() && this.statusId() === 3);
  canReopen = computed(() => (this.isFiler() || this.isHandler()) && this.statusId() === 3);

  backLink = computed(() => {
    if (this.isAdmin()) return '/admin/complaints';
    if (this.isOwner() && !this.isFiler()) return '/owner/complaints';
    return '/complaints';
  });

  ngOnInit(): void {
    this.complaintId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.complaintService.getById(this.complaintId).subscribe({
      next: (c) => {
        this.complaint.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  // ── Comments ──────────────────────────────────────────────
  postComment(): void {
    const message = this.newComment.trim();
    if (!message || this.postingComment()) return;

    this.postingComment.set(true);
    this.commentError.set(null);
    this.complaintService.addComment(this.complaintId, { message }).subscribe({
      next: (comment) => {
        this.appendComment(comment);
        this.newComment = '';
        this.postingComment.set(false);
      },
      error: (err) => {
        this.postingComment.set(false);
        this.commentError.set(extractApiError(err, 'Failed to post your message.'));
      },
    });
  }

  private appendComment(comment: ComplaintComment): void {
    this.complaint.update((c) =>
      c ? { ...c, comments: [...c.comments, comment], commentCount: c.commentCount + 1 } : c,
    );
  }

  // ── Status transitions ────────────────────────────────────
  startWork(): void {
    this.openStatusChange({
      statusId: 2,
      title: 'Start Working on Complaint',
      confirmLabel: 'Mark In Progress',
      noteLabel: 'Note to tenant (optional)',
      notePlaceholder: "e.g. We've scheduled a plumber for tomorrow.",
    });
  }

  resolve(): void {
    this.openStatusChange({
      statusId: 3,
      title: 'Mark as Resolved',
      confirmLabel: 'Mark Resolved',
      noteLabel: 'Resolution summary (optional)',
      notePlaceholder: 'e.g. Replaced the tap washer; leak fixed.',
    });
  }

  cancel(): void {
    this.openStatusChange({
      statusId: 5,
      title: 'Cancel Complaint',
      confirmLabel: 'Cancel Complaint',
      noteLabel: 'Reason (optional)',
      notePlaceholder: 'e.g. Resolved on my own, no longer needed.',
    });
  }

  close(): void {
    this.openStatusChange({
      statusId: 4,
      title: 'Close Complaint',
      confirmLabel: 'Close as Satisfied',
      noteLabel: 'Feedback (optional)',
      notePlaceholder: 'e.g. Thanks, sorted quickly!',
    });
  }

  reopen(): void {
    this.openStatusChange({
      statusId: 2,
      title: 'Reopen Complaint',
      confirmLabel: 'Reopen',
      noteLabel: 'Why are you reopening? (optional)',
      notePlaceholder: 'e.g. The leak has started again.',
    });
  }

  private openStatusChange(pending: PendingStatus): void {
    this.pending.set(pending);
    this.statusNote = '';
    this.statusError.set(null);
    this.updatingStatus.set(false);
  }

  closeStatusDialog(): void {
    if (this.updatingStatus()) return;
    this.pending.set(null);
  }

  confirmStatusChange(): void {
    const pending = this.pending();
    if (!pending || this.updatingStatus()) return;

    this.updatingStatus.set(true);
    this.statusError.set(null);
    this.complaintService
      .updateStatus(this.complaintId, {
        statusId: pending.statusId,
        note: this.statusNote.trim() || null,
      })
      .subscribe({
        next: (updated) => {
          this.complaint.update((c) => ({
            ...updated,
            comments: updated.comments?.length ? updated.comments : (c?.comments ?? []),
            commentCount: updated.commentCount || (c?.commentCount ?? 0),
          }));
          this.updatingStatus.set(false);
          this.pending.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'Updated',
            detail: `Complaint marked as ${this.statusLabel(updated.statusId)}.`,
          });
        },
        error: (err) => {
          this.updatingStatus.set(false);
          this.statusError.set(extractApiError(err, 'Failed to update the complaint.'));
        },
      });
  }

  // ── Presentation helpers ──────────────────────────────────
  roleSeverity(role: string | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (role) {
      case 'Owner': return 'success';
      case 'Admin': return 'warn';
      case 'Tenant': return 'info';
      default: return 'secondary';
    }
  }

  authorInitial(name: string | null): string {
    return (name?.trim()?.[0] ?? '?').toUpperCase();
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

  formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  }
}
