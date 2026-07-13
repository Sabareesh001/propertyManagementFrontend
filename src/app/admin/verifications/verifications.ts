import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PropertyVerificationsComponent } from './property-verifications';
import { UserVerificationsComponent } from './user-verifications';
import { LeaseVerificationsComponent } from './lease-verifications';
import { SignedLeaseVerificationsComponent } from './signed-lease-verifications';
import { CancellationVerificationsComponent } from './cancellation-verifications';
import { SignedCancellationVerificationsComponent } from './signed-cancellation-verifications';

type Section = 'property' | 'user' | 'lease' | 'signed-lease' | 'cancellation-template' | 'cancellation-signed';

@Component({
  selector: 'app-verifications',
  standalone: true,
  imports: [
    PropertyVerificationsComponent,
    UserVerificationsComponent,
    LeaseVerificationsComponent,
    SignedLeaseVerificationsComponent,
    CancellationVerificationsComponent,
    SignedCancellationVerificationsComponent,
  ],
  templateUrl: './verifications.html',
  styleUrl: './verifications.css',
})
export class VerificationsComponent {
  private route = inject(ActivatedRoute);

  section = toSignal(
    this.route.params.pipe(map((p) => (p['section'] as Section) ?? 'property')),
    { initialValue: 'property' as Section },
  );
}
