import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { DatePicker } from 'primeng/datepicker';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Divider } from 'primeng/divider';
import { SharedModule } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';

function minAge(years: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    return new Date(control.value) <= cutoff ? null : { minAge: { required: years } };
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputText,
    Password,
    DatePicker,
    SelectButton,
    Button,
    Message,
    Divider,
    SharedModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMessage = '';
  successMessage = '';

  readonly maxDob: Date = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  })();

  roleOptions = [
    { label: 'Tenant', value: 1 },
    { label: 'Owner', value: 2 },
  ];

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[A-Za-z\s\-']+$/)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[A-Za-z\s\-']+$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[+\d\s\-()]{7,15}$/)]],
    dateOfBirth: [null as Date | null, [Validators.required, minAge(18)]],
    password: ['', [
      Validators.required,
      Validators.minLength(12),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/),
    ]],
    roleId: [1, Validators.required],
  });

  get f() { return this.form.controls; }

  fieldError(field: keyof typeof this.form.controls): string {
    const ctrl = this.form.get(field)!;
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required')) return 'This field is required.';
    if (ctrl.hasError('email')) return 'Enter a valid email address.';
    if (ctrl.hasError('minlength')) return `Minimum ${ctrl.errors?.['minlength'].requiredLength} characters.`;
    if (ctrl.hasError('maxlength')) return `Maximum ${ctrl.errors?.['maxlength'].requiredLength} characters.`;
    if (ctrl.hasError('pattern')) {
      if (field === 'password') return 'Must contain uppercase, lowercase, digit, and special character.';
      if (field === 'phone') return 'Enter a valid phone number.';
      return 'Invalid characters.';
    }
    if (ctrl.hasError('minAge')) return `You must be at least ${ctrl.errors?.['minAge'].required} years old.`;
    return 'Invalid value.';
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dob = this.f.dateOfBirth.value!;
    const payload = {
      ...this.form.value,
      dateOfBirth: dob instanceof Date ? dob.toISOString().split('T')[0] : dob,
      roleId: this.f.roleId.value!,
      firstName: this.f.firstName.value!,
      lastName: this.f.lastName.value!,
      email: this.f.email.value!,
      phone: this.f.phone.value!,
      password: this.f.password.value!,
    };

    this.auth.register(payload as any).subscribe({
      next: () => {
        this.successMessage = 'Account created! Check your email to verify your address.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Registration failed. Please try again.';
        this.loading = false;
      },
    });
  }
}
