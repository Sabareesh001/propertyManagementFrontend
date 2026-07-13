import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { AuthService } from '../../core/services/auth.service';
import { extractApiError } from '../../core/api.config';

type VerifyState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, Button, ProgressSpinner],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  state: VerifyState = 'loading';
  message = '';

  ngOnInit() {
    const hash = this.route.snapshot.paramMap.get('hash');
    if (!hash) {
      this.state = 'error';
      this.message = 'This verification link is invalid.';
      return;
    }

    this.authService.verifyEmail(hash).subscribe({
      next: (res) => {
        this.state = 'success';
        this.message = res?.message ?? 'Your email address has been verified.';
      },
      error: (err) => {
        this.state = 'error';
        this.message = extractApiError(err, 'This verification link is invalid or has expired.');
      },
    });
  }
}
