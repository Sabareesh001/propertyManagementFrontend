import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../store/auth/auth.actions';
import { selectAuthLoading, selectAuthError } from '../../store/auth/auth.selectors';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    InputText,
    Password,
    Button,
    Message,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  loading$ = this.store.select(selectAuthLoading);
  errorMessage$ = this.store.select(selectAuthError);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  get f() { return this.form.controls; }

  fieldError(field: 'email' | 'password'): string {
    const ctrl = this.form.get(field)!;
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required')) return 'This field is required.';
    if (ctrl.hasError('email')) return 'Enter a valid email address.';
    return 'Invalid value.';
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.store.dispatch(AuthActions.login({
      credentials: {
        email: this.f.email.value!,
        password: this.f.password.value!,
      },
    }));
  }
}
