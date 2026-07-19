import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';
import { extractApiError } from '../../core/api.config';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

type ResetState = 'form' | 'invalid' | 'success';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Password, Button, Message],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  state = signal<ResetState>('form');
  loading = signal(false);
  errorMessage = signal('');
  token = '';

  form = this.fb.group({
    newPassword: ['', [
      Validators.required,
      Validators.minLength(12),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/),
    ]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  get f() { return this.form.controls; }

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.router.navigate(['/auth/forgot-password']);
      return;
    }
    this.token = token;
  }

  fieldError(field: 'newPassword' | 'confirmPassword'): string {
    const ctrl = this.form.get(field)!;
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required')) return 'This field is required.';
    if (ctrl.hasError('minlength')) return `Minimum ${ctrl.errors?.['minlength'].requiredLength} characters.`;
    if (ctrl.hasError('pattern')) return 'Must contain uppercase, lowercase, digit, and special character.';
    return 'Invalid value.';
  }

  confirmError(): string {
    const ctrl = this.form.get('confirmPassword')!;
    if (!ctrl.touched) return '';
    if (ctrl.hasError('required')) return 'This field is required.';
    if (this.form.hasError('passwordsMismatch') && ctrl.value) return 'Passwords do not match.';
    return '';
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.resetPassword({
      token: this.token,
      newPassword: this.f.newPassword.value!,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.state.set('success');
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404) {
          this.state.set('invalid');
        } else {
          this.errorMessage.set(extractApiError(err, 'Something went wrong. Please try again.'));
        }
      },
    });
  }
}
