import { Component, Input, Output, EventEmitter, inject, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { LeaseService, LeaseResponse } from '../../core/services/lease.service';
import { extractApiError } from '../../core/api.config';
import { AgreementDocumentModalComponent } from '../agreement-document-modal/agreement-document-modal';
import { SafeUrlPipe } from '../pipes/safe-url.pipe';

@Component({
  selector: 'app-sign-lease-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, DividerModule, MessageModule, AgreementDocumentModalComponent, SafeUrlPipe],
  templateUrl: './sign-lease-modal.html',
  styleUrl: './sign-lease-modal.css',
})
export class SignLeaseModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() lease: LeaseResponse | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() signed = new EventEmitter<LeaseResponse>();

  private leaseService = inject(LeaseService);

  signedAgreementDocumentUrl: string | null = null;

  submitting = signal(false);
  uploading = signal(false);
  errorMessage = signal<string | null>(null);
  success = signal(false);
  agreementViewerVisible = signal(false);

  ngOnChanges(): void {
    if (this.visible && this.lease) {
      this.signedAgreementDocumentUrl = null;
      this.errorMessage.set(null);
      this.success.set(false);
      this.submitting.set(false);
      this.uploading.set(false);
    }
  }

  openAgreementViewer(): void {
    this.agreementViewerVisible.set(true);
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.errorMessage.set(null);
    this.leaseService.uploadDocument(file).subscribe({
      next: ({ url }) => {
        this.signedAgreementDocumentUrl = url;
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.errorMessage.set(extractApiError(err, 'Failed to upload the signed document.'));
        input.value = '';
      },
    });
  }

  clearDocument(): void {
    this.signedAgreementDocumentUrl = null;
  }

  get canSubmit(): boolean {
    return !!this.signedAgreementDocumentUrl && !this.uploading();
  }

  close(): void {
    if (this.submitting()) return;
    this.visibleChange.emit(false);
  }

  submitSignature(): void {
    if (!this.lease || !this.signedAgreementDocumentUrl) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.leaseService.sign(this.lease.id, this.signedAgreementDocumentUrl).subscribe({
      next: (updated) => {
        this.submitting.set(false);
        this.success.set(true);
        this.signed.emit(updated);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(extractApiError(err, 'Failed to sign the lease.'));
      },
    });
  }
}
