import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { RevenueComponent } from './revenue/revenue';
import { TransactionsComponent } from './transactions/transactions';
import { ChargesComponent } from './charges/charges';

type Section = 'revenue' | 'transactions' | 'charges';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [RevenueComponent, TransactionsComponent, ChargesComponent],
  template: `
    <div class="finance-content">
      @switch (section()) {
        @case ('transactions') {
          <app-finance-transactions />
        }
        @case ('charges') {
          <app-finance-charges />
        }
        @default {
          <app-finance-revenue />
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 0;
        min-width: 0;
      }
      .finance-content {
        display: flex;
        flex: 1;
        min-height: 0;
        min-width: 0;
      }
    `,
  ],
})
export class FinanceComponent {
  private route = inject(ActivatedRoute);

  section = toSignal(
    this.route.params.pipe(map((p) => (p['section'] as Section) ?? 'revenue')),
    { initialValue: 'revenue' as Section },
  );
}
