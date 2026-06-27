import { Component, Input, Output, EventEmitter, inject, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import {
  ChargeService,
  ChargeResponse,
  CHARGE_TYPES,
} from '../../core/services/charge.service';
import { extractApiError } from '../../core/api.config';

@Component({
  selector: 'app-add-charge-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    TextareaModule,
    DatePickerModule,
    MessageModule,
  ],
  templateUrl: './add-charge-modal.html',
  styleUrl: './add-charge-modal.css',
})
export class AddChargeModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() leaseId: string | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<ChargeResponse>();

  private chargeService = inject(ChargeService);

  chargeTypes = [...CHARGE_TYPES];
  minDueDate = new Date();

  chargeTypeId: number | null = null;
  amount: number | null = null;
  description = '';
  dueDate: Date | null = null;

  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnChanges(): void {
    if (this.visible) {
      this.chargeTypeId = null;
      this.amount = null;
      this.description = '';
      this.dueDate = null;
      this.minDueDate = new Date();
      this.errorMessage.set(null);
      this.submitting.set(false);
    }
  }

  get canSubmit(): boolean {
    return (
      this.chargeTypeId !== null &&
      this.amount !== null &&
      this.amount > 0 &&
      this.dueDate !== null &&
      !this.submitting()
    );
  }

  close(): void {
    if (this.submitting()) return;
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (!this.leaseId || !this.canSubmit) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.chargeService
      .applyCharge(this.leaseId, {
        chargeTypeId: this.chargeTypeId!,
        amount: this.amount!,
        description: this.description.trim() || null,
        dueDate: this.dueDate!.toISOString(),
      })
      .subscribe({
        next: (charge) => {
          this.submitting.set(false);
          this.created.emit(charge);
          this.visibleChange.emit(false);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(extractApiError(err, 'Failed to apply the charge.'));
        },
      });
  }
}
