import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  ChargeService,
  ChargeResponse,
  PaymentIntentResponse,
  STRIPE_PAYMENT_METHOD_ID,
} from '../../core/services/charge.service';
import { ThemeService } from '../../core/services/theme.service';
import { extractApiError } from '../../core/api.config';

/** One selectable allocation row in the payment form. */
interface AllocationRow {
  charge: ChargeResponse;
  selected: boolean;
  amount: number | null;
}

type PayStep = 'select' | 'pay';

@Component({
  selector: 'app-pay-charges-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    TagModule,
    MessageModule,
    DividerModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './pay-charges-modal.html',
  styleUrl: './pay-charges-modal.css',
})
export class PayChargesModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() leaseId: string | null = null;
  /** Charges eligible for payment (Pending / Partially Paid / Overdue). */
  @Input() charges: ChargeResponse[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  /** Emitted once Stripe confirms the payment succeeded. */
  @Output() paid = new EventEmitter<string>();

  @ViewChild('paymentElement') paymentElementRef?: ElementRef<HTMLDivElement>;

  private chargeService = inject(ChargeService);
  private themeService = inject(ThemeService);

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  rows = signal<AllocationRow[]>([]);
  step = signal<PayStep>('select');
  intent = signal<PaymentIntentResponse | null>(null);

  creatingIntent = signal(false);
  mountingElement = signal(false);
  paying = signal(false);
  errorMessage = signal<string | null>(null);

  totalAmount = computed(() =>
    this.rows()
      .filter((r) => r.selected)
      .reduce((sum, r) => sum + (r.amount ?? 0), 0),
  );

  selectedCount = computed(() => this.rows().filter((r) => r.selected).length);

  busy = computed(() => this.creatingIntent() || this.paying());

  ngOnChanges(): void {
    if (this.visible) {
      this.rows.set(
        this.charges
          .filter((c) => c.balanceDue > 0 && c.statusId !== 5)
          .map((charge) => ({ charge, selected: false, amount: charge.balanceDue })),
      );
      this.step.set('select');
      this.intent.set(null);
      this.errorMessage.set(null);
      this.creatingIntent.set(false);
      this.mountingElement.set(false);
      this.paying.set(false);
      this.stripe = null;
      this.elements = null;
    }
  }

  toggleRow(row: AllocationRow, selected: boolean): void {
    this.rows.update((rows) =>
      rows.map((r) => (r === row ? { ...r, selected, amount: selected ? r.charge.balanceDue : r.amount } : r)),
    );
  }

  updateAmount(row: AllocationRow, amount: number | null): void {
    this.rows.update((rows) => rows.map((r) => (r === row ? { ...r, amount } : r)));
  }

  get allocationsValid(): boolean {
    const selected = this.rows().filter((r) => r.selected);
    return (
      selected.length > 0 &&
      selected.every((r) => r.amount !== null && r.amount > 0 && r.amount <= r.charge.balanceDue)
    );
  }

  close(): void {
    if (this.busy()) return;
    this.visibleChange.emit(false);
  }

  /** Step 1 → 2: create the Stripe payment intent, then mount the Payment Element. */
  proceedToPay(): void {
    if (!this.leaseId || !this.allocationsValid || this.busy()) return;

    this.creatingIntent.set(true);
    this.errorMessage.set(null);

    this.chargeService
      .createPaymentIntent(this.leaseId, {
        chargeAllocations: this.rows()
          .filter((r) => r.selected)
          .map((r) => ({ chargeId: r.charge.id, amount: r.amount! })),
        paymentMethodId: STRIPE_PAYMENT_METHOD_ID,
        transactionRef: `STRIPE-${Date.now()}`,
        currencyId: 1,
      })
      .subscribe({
        next: (intent) => this.mountPaymentElement(intent),
        error: (err) => {
          this.creatingIntent.set(false);
          this.errorMessage.set(
            extractApiError(err, 'Could not start the payment. The owner may not have completed Stripe onboarding yet.'),
          );
        },
      });
  }

  private async mountPaymentElement(intent: PaymentIntentResponse): Promise<void> {
    try {
      if (!intent.publishableKey || !intent.publishableKey.trim()) {
        throw new Error('Stripe publishable key was not provided by the server. Please ensure Stripe configuration is set.');
      }

      this.stripe = await loadStripe(intent.publishableKey);
      if (!this.stripe) {
        throw new Error('Stripe.js failed to initialize. Please check network connection or publishable key.');
      }

      this.intent.set(intent);
      this.creatingIntent.set(false);
      this.mountingElement.set(true);
      this.step.set('pay');

      // Wait for Angular to render step-2 container in DOM before mounting.
      setTimeout(() => {
        try {
          if (!this.stripe) return;
          if (!this.paymentElementRef?.nativeElement) {
            throw new Error('Stripe payment form container was not found in the DOM.');
          }

          this.elements = this.stripe.elements({
            clientSecret: intent.clientSecret,
            appearance: { theme: this.themeService.isDark() ? 'night' : 'stripe' },
          });

          const element = this.elements.create('payment');
          element.on('ready', () => this.mountingElement.set(false));
          element.on('loaderror', (event) => {
            this.mountingElement.set(false);
            this.errorMessage.set(event.error.message || 'Could not load the Stripe payment form.');
          });
          element.mount(this.paymentElementRef.nativeElement);
        } catch (err: any) {
          this.mountingElement.set(false);
          this.errorMessage.set(
            err?.message || 'Could not load the Stripe payment form. Please try again.',
          );
        }
      }, 50);
    } catch (err: any) {
      this.creatingIntent.set(false);
      this.mountingElement.set(false);
      this.errorMessage.set(
        err?.message || 'Could not load the Stripe payment form. Please try again.',
      );
    }
  }

  async confirmPayment(): Promise<void> {
    if (!this.stripe || !this.elements || this.paying()) return;

    this.paying.set(true);
    this.errorMessage.set(null);

    try {
      const { error, paymentIntent } = await this.stripe.confirmPayment({
        elements: this.elements,
        redirect: 'if_required',
      });

      this.paying.set(false);

      if (error) {
        this.errorMessage.set(error.message ?? 'The payment could not be completed.');
        return;
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        this.paid.emit(this.intent()?.paymentId ?? '');
        this.visibleChange.emit(false);
      } else {
        this.errorMessage.set('The payment was not completed. Please try again.');
      }
    } catch (err: any) {
      this.paying.set(false);
      this.errorMessage.set(
        err?.message ?? 'An unexpected error occurred while confirming payment. Please try again.',
      );
    }
  }

  backToSelect(): void {
    if (this.busy()) return;
    this.step.set('select');
    this.intent.set(null);
    this.elements = null;
    this.errorMessage.set(null);
  }

  formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  }
}
