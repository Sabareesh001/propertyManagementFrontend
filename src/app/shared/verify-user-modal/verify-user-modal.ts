import { Component, Input, Output, EventEmitter, inject, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { forkJoin, switchMap } from 'rxjs';
import {
  UserVerificationService,
  UserVerificationResponse,
  VERIFICATION_DOCUMENT_TYPES,
} from '../../core/services/user-verification.service';
import { extractApiError } from '../../core/api.config';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface DocumentRow {
  documentTypeId: number | null;
  documentNumber: string;
  file: File | null;
  error: string | null;
}

@Component({
  selector: 'app-verify-user-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    MessageModule,
  ],
  templateUrl: './verify-user-modal.html',
  styleUrl: './verify-user-modal.css',
})
export class VerifyUserModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() submitted = new EventEmitter<UserVerificationResponse>();

  private verificationService = inject(UserVerificationService);

  documentTypes = [...VERIFICATION_DOCUMENT_TYPES];
  rows = signal<DocumentRow[]>([this.emptyRow()]);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnChanges(): void {
    if (this.visible) {
      this.rows.set([this.emptyRow()]);
      this.errorMessage.set(null);
      this.submitting.set(false);
    }
  }

  private emptyRow(): DocumentRow {
    return { documentTypeId: null, documentNumber: '', file: null, error: null };
  }

  addRow(): void {
    this.rows.update((rows) => [...rows, this.emptyRow()]);
  }

  removeRow(index: number): void {
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
  }

  updateRow(index: number, patch: Partial<DocumentRow>): void {
    this.rows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch, error: null } : row)),
    );
  }

  onFileChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.updateRow(index, { file: null });
      this.rows.update((rows) =>
        rows.map((row, i) => (i === index ? { ...row, error: 'Only PDF files are allowed.' } : row)),
      );
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.updateRow(index, { file: null });
      this.rows.update((rows) =>
        rows.map((row, i) => (i === index ? { ...row, error: 'File must be 10 MB or smaller.' } : row)),
      );
      return;
    }
    this.updateRow(index, { file });
  }

  get canSubmit(): boolean {
    return !this.submitting() && this.rows().length > 0;
  }

  close(): void {
    if (this.submitting()) return;
    this.visibleChange.emit(false);
  }

  private validate(): boolean {
    let valid = true;
    this.rows.update((rows) =>
      rows.map((row) => {
        let error: string | null = null;
        if (row.documentTypeId === null) {
          error = 'Select a document type.';
        } else if (!/^[a-zA-Z0-9\-]{4,50}$/.test(row.documentNumber.trim())) {
          error = 'Document number must be 4–50 characters: letters, digits, and hyphens only.';
        } else if (!row.file) {
          error = 'Attach the document as a PDF.';
        }
        if (error) valid = false;
        return { ...row, error };
      }),
    );
    return valid;
  }

  submit(): void {
    if (this.submitting() || !this.validate()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const rows = this.rows();
    forkJoin(rows.map((row) => this.verificationService.uploadDocument(row.file!)))
      .pipe(
        switchMap((uploads) =>
          this.verificationService.submit(
            rows.map((row, i) => ({
              documentTypeId: row.documentTypeId!,
              documentNumber: row.documentNumber.trim(),
              documentUrl: uploads[i].url,
            })),
          ),
        ),
      )
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.submitted.emit(response);
          this.visibleChange.emit(false);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(extractApiError(err, 'Failed to submit verification documents.'));
        },
      });
  }
}
