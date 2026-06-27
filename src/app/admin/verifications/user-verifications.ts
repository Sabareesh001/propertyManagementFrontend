import { Component } from '@angular/core';

@Component({
  selector: 'app-user-verifications',
  standalone: true,
  template: `
    <div class="verification-placeholder">
      <i class="pi pi-verified"></i>
      <p class="label">User Verifications</p>
      <p class="hint">Content coming soon.</p>
    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; }
    .verification-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 0.75rem; text-align: center; padding: 2rem; }
    i { font-size: 2.5rem; color: var(--p-primary-color); }
    .label { font-size: 1.25rem; font-weight: 600; color: var(--p-text-color); margin: 0; }
    .hint { font-size: 0.875rem; color: var(--p-text-muted-color); margin: 0; }
  `],
})
export class UserVerificationsComponent {}
