import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

type Section = 'property' | 'user' | 'lease';

@Component({
  selector: 'app-verifications',
  standalone: true,
  imports: [],
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
