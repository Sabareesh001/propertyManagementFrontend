import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RegisterComponent } from './register';
import { AuthService } from '../../core/services/auth.service';

// ─── helpers ─────────────────────────────────────────────────────────────────

function createAuthServiceSpy() {
  return { register: vi.fn() };
}

function createRouterSpy() {
  return { navigate: vi.fn() };
}

/** Just over 18: 18 years ago minus one day. */
function dobJustOver18(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  d.setDate(d.getDate() - 1);
  return d;
}

/** Exactly on the 18th birthday cutoff (still valid). */
function dobExactly18(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

/** One day short of 18 (invalid). */
function dobUnder18(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  d.setDate(d.getDate() + 1);
  return d;
}

const VALID_PAYLOAD = {
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  phone: '+1234567890',
  dateOfBirth: dobJustOver18(),
  password: 'Str0ng!Pass#12',
  roleId: 1,
};

// ─── suite ───────────────────────────────────────────────────────────────────

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authSpy: ReturnType<typeof createAuthServiceSpy>;
  let routerSpy: ReturnType<typeof createRouterSpy>;

  beforeEach(async () => {
    authSpy = createAuthServiceSpy();
    routerSpy = createRouterSpy();

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}), queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('creates the component', () => {
      expect(component).toBeTruthy();
    });

    it('form is invalid on load (required fields are empty)', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('defaults roleId to Tenant (1)', () => {
      expect(component.f.roleId.value).toBe(1);
    });

    it('loading, errorMessage, successMessage start falsy', () => {
      expect(component.loading).toBe(false);
      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe('');
    });

    it('maxDob is exactly 18 years before today', () => {
      const expected = new Date();
      expected.setFullYear(expected.getFullYear() - 18);
      expect(component.maxDob.toDateString()).toBe(expected.toDateString());
    });

    it('roleOptions contains Tenant and Owner', () => {
      expect(component.roleOptions).toEqual([
        { label: 'Tenant', value: 1 },
        { label: 'Owner', value: 2 },
      ]);
    });
  });

  // ── fieldError() ──────────────────────────────────────────────────────────

  describe('fieldError()', () => {
    it('returns empty string when field is untouched', () => {
      expect(component.fieldError('firstName')).toBe('');
    });

    it('returns empty string when field is valid and touched', () => {
      component.f.firstName.setValue('Alice');
      component.f.firstName.markAsTouched();
      expect(component.fieldError('firstName')).toBe('');
    });

    it('returns required message when touched and empty', () => {
      component.f.firstName.setValue('');
      component.f.firstName.markAsTouched();
      expect(component.fieldError('firstName')).toBe('This field is required.');
    });

    it('returns email message for invalid email format', () => {
      component.f.email.setValue('not-an-email');
      component.f.email.markAsTouched();
      expect(component.fieldError('email')).toBe('Enter a valid email address.');
    });

    it('returns minlength message for firstName < 2 chars', () => {
      component.f.firstName.setValue('A');
      component.f.firstName.markAsTouched();
      expect(component.fieldError('firstName')).toContain('Minimum 2 characters');
    });

    it('returns maxlength message for firstName > 100 chars', () => {
      component.f.firstName.setValue('A'.repeat(101));
      component.f.firstName.markAsTouched();
      expect(component.fieldError('firstName')).toContain('Maximum 100 characters');
    });

    it('returns invalid-characters message for firstName with digits', () => {
      component.f.firstName.setValue('Alice1');
      component.f.firstName.markAsTouched();
      expect(component.fieldError('firstName')).toBe('Invalid characters.');
    });

    it('returns phone pattern message for non-numeric phone', () => {
      component.f.phone.setValue('abcdefg');
      component.f.phone.markAsTouched();
      expect(component.fieldError('phone')).toBe('Enter a valid phone number.');
    });

    it('returns password pattern message for weak password', () => {
      component.f.password.setValue('alllowercase1!');
      component.f.password.markAsTouched();
      expect(component.fieldError('password')).toBe(
        'Must contain uppercase, lowercase, digit, and special character.'
      );
    });

    it('returns minAge message when user is under 18', () => {
      component.f.dateOfBirth.setValue(dobUnder18());
      component.f.dateOfBirth.markAsTouched();
      expect(component.fieldError('dateOfBirth')).toContain('at least 18 years old');
    });

    it('returns empty string when age is exactly 18', () => {
      component.f.dateOfBirth.setValue(dobExactly18());
      component.f.dateOfBirth.markAsTouched();
      expect(component.fieldError('dateOfBirth')).toBe('');
    });
  });

  // ── firstName validation ───────────────────────────────────────────────────

  describe('firstName field', () => {
    it('is invalid when empty', () => {
      component.f.firstName.setValue('');
      expect(component.f.firstName.invalid).toBe(true);
    });

    it('is invalid when 1 character (minLength)', () => {
      component.f.firstName.setValue('A');
      expect(component.f.firstName.invalid).toBe(true);
    });

    it('is valid at minimum 2 characters', () => {
      component.f.firstName.setValue('Al');
      expect(component.f.firstName.valid).toBe(true);
    });

    it('is invalid when > 100 characters', () => {
      component.f.firstName.setValue('A'.repeat(101));
      expect(component.f.firstName.invalid).toBe(true);
    });

    it('is valid at exactly 100 characters', () => {
      component.f.firstName.setValue('A'.repeat(100));
      expect(component.f.firstName.valid).toBe(true);
    });

    it('accepts hyphenated names', () => {
      component.f.firstName.setValue('Mary-Jane');
      expect(component.f.firstName.valid).toBe(true);
    });

    it("accepts names with apostrophes (O'Brien)", () => {
      component.f.firstName.setValue("O'Brien");
      expect(component.f.firstName.valid).toBe(true);
    });

    it('rejects names with digits', () => {
      component.f.firstName.setValue('Alice2');
      expect(component.f.firstName.invalid).toBe(true);
    });

    it('rejects names with special characters other than hyphen/apostrophe', () => {
      component.f.firstName.setValue('Alice@');
      expect(component.f.firstName.invalid).toBe(true);
    });
  });

  // ── lastName validation ────────────────────────────────────────────────────

  describe('lastName field', () => {
    it('is invalid when empty', () => {
      component.f.lastName.setValue('');
      expect(component.f.lastName.invalid).toBe(true);
    });

    it('is valid with 2 chars', () => {
      component.f.lastName.setValue('Li');
      expect(component.f.lastName.valid).toBe(true);
    });

    it('is invalid with 1 char', () => {
      component.f.lastName.setValue('L');
      expect(component.f.lastName.invalid).toBe(true);
    });

    it('is invalid with > 100 chars', () => {
      component.f.lastName.setValue('Z'.repeat(101));
      expect(component.f.lastName.invalid).toBe(true);
    });

    it('rejects digits', () => {
      component.f.lastName.setValue('Smith3');
      expect(component.f.lastName.invalid).toBe(true);
    });
  });

  // ── email validation ───────────────────────────────────────────────────────

  describe('email field', () => {
    it('is invalid when empty', () => {
      component.f.email.setValue('');
      expect(component.f.email.invalid).toBe(true);
    });

    it('is invalid without @', () => {
      component.f.email.setValue('aliceexample.com');
      expect(component.f.email.invalid).toBe(true);
    });

    it('is invalid without domain', () => {
      component.f.email.setValue('alice@');
      expect(component.f.email.invalid).toBe(true);
    });

    it('is valid for standard email', () => {
      component.f.email.setValue('alice@example.com');
      expect(component.f.email.valid).toBe(true);
    });

    it('is valid with subdomain', () => {
      component.f.email.setValue('alice@mail.example.co.uk');
      expect(component.f.email.valid).toBe(true);
    });

    it('is valid with plus-addressing', () => {
      component.f.email.setValue('alice+tag@example.com');
      expect(component.f.email.valid).toBe(true);
    });
  });

  // ── phone validation ───────────────────────────────────────────────────────

  describe('phone field', () => {
    it('is invalid when empty', () => {
      component.f.phone.setValue('');
      expect(component.f.phone.invalid).toBe(true);
    });

    it('is invalid for fewer than 7 characters', () => {
      component.f.phone.setValue('123456');
      expect(component.f.phone.invalid).toBe(true);
    });

    it('is valid for a 7-digit number', () => {
      component.f.phone.setValue('1234567');
      expect(component.f.phone.valid).toBe(true);
    });

    it('is valid with international prefix', () => {
      component.f.phone.setValue('+1-800-555-01');
      expect(component.f.phone.valid).toBe(true);
    });

    it('is invalid with letters', () => {
      component.f.phone.setValue('CALL-ME-NOW');
      expect(component.f.phone.invalid).toBe(true);
    });

    it('is invalid beyond 15 characters', () => {
      component.f.phone.setValue('1234567890123456');
      expect(component.f.phone.invalid).toBe(true);
    });
  });

  // ── dateOfBirth / minAge validation ───────────────────────────────────────

  describe('dateOfBirth field', () => {
    it('is invalid when null', () => {
      component.f.dateOfBirth.setValue(null);
      expect(component.f.dateOfBirth.invalid).toBe(true);
    });

    it('is invalid for someone under 18', () => {
      component.f.dateOfBirth.setValue(dobUnder18());
      expect(component.f.dateOfBirth.invalid).toBe(true);
    });

    it('is valid on the exact 18th birthday', () => {
      component.f.dateOfBirth.setValue(dobExactly18());
      expect(component.f.dateOfBirth.valid).toBe(true);
    });

    it('is valid for someone well over 18', () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 30);
      component.f.dateOfBirth.setValue(d);
      expect(component.f.dateOfBirth.valid).toBe(true);
    });
  });

  // ── password validation ────────────────────────────────────────────────────

  describe('password field', () => {
    it('is invalid when empty', () => {
      component.f.password.setValue('');
      expect(component.f.password.invalid).toBe(true);
    });

    it('is invalid when under 12 characters', () => {
      component.f.password.setValue('Short!1A');
      expect(component.f.password.invalid).toBe(true);
    });

    it('is invalid with no uppercase letter', () => {
      component.f.password.setValue('alllowercase1!');
      expect(component.f.password.invalid).toBe(true);
    });

    it('is invalid with no lowercase letter', () => {
      component.f.password.setValue('ALLUPPERCASE1!');
      expect(component.f.password.invalid).toBe(true);
    });

    it('is invalid with no digit', () => {
      component.f.password.setValue('NoDigitsHere!!');
      expect(component.f.password.invalid).toBe(true);
    });

    it('is invalid with no special character', () => {
      component.f.password.setValue('NoSpecial1234A');
      expect(component.f.password.invalid).toBe(true);
    });

    it('is valid when all constraints are met', () => {
      component.f.password.setValue('Str0ng!Pass#12');
      expect(component.f.password.valid).toBe(true);
    });

    it('is valid at exactly 12 characters meeting all rules', () => {
      component.f.password.setValue('Abcdef1!xYzW');
      expect(component.f.password.valid).toBe(true);
    });
  });

  // ── roleId validation ──────────────────────────────────────────────────────

  describe('roleId field', () => {
    it('is valid when set to Tenant (1)', () => {
      component.f.roleId.setValue(1);
      expect(component.f.roleId.valid).toBe(true);
    });

    it('is valid when set to Owner (2)', () => {
      component.f.roleId.setValue(2);
      expect(component.f.roleId.valid).toBe(true);
    });

    it('is invalid when cleared to null', () => {
      component.f.roleId.setValue(null as any);
      expect(component.f.roleId.invalid).toBe(true);
    });
  });

  // ── onSubmit – invalid form ────────────────────────────────────────────────

  describe('onSubmit() with invalid form', () => {
    it('marks all controls as touched on submit', () => {
      component.onSubmit();
      Object.values(component.form.controls).forEach(ctrl => {
        expect(ctrl.touched).toBe(true);
      });
    });

    it('does not call auth.register when form is invalid', () => {
      component.onSubmit();
      expect(authSpy.register).not.toHaveBeenCalled();
    });

    it('does not set loading when form is invalid', () => {
      component.onSubmit();
      expect(component.loading).toBe(false);
    });
  });

  // ── onSubmit – success ─────────────────────────────────────────────────────

  describe('onSubmit() success path', () => {
    beforeEach(() => {
      component.form.setValue(VALID_PAYLOAD);
      authSpy.register.mockReturnValue(of({ id: 1, email: 'alice@example.com' } as any));
    });

    it('calls auth.register with correctly shaped payload', () => {
      component.onSubmit();
      expect(authSpy.register).toHaveBeenCalledOnce();
      expect(authSpy.register).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          phone: '+1234567890',
          roleId: 1,
          password: 'Str0ng!Pass#12',
        })
      );
    });

    it('serialises dateOfBirth as YYYY-MM-DD string', () => {
      component.onSubmit();
      const payload = authSpy.register.mock.calls[0][0];
      expect(typeof payload.dateOfBirth).toBe('string');
      expect(payload.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('sets successMessage on success', () => {
      component.onSubmit();
      expect(component.successMessage).toContain('Account created');
    });

    it('clears errorMessage on success', () => {
      component.errorMessage = 'previous error';
      component.onSubmit();
      expect(component.errorMessage).toBe('');
    });

    it('resets loading to false after success', () => {
      component.onSubmit();
      expect(component.loading).toBe(false);
    });

    it('navigates to /auth/login after 2 seconds', () => {
      vi.useFakeTimers();
      component.onSubmit();
      vi.advanceTimersByTime(2000);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
      vi.useRealTimers();
    });

    it('does not navigate before 2 seconds have elapsed', () => {
      vi.useFakeTimers();
      component.onSubmit();
      vi.advanceTimersByTime(1999);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  // ── onSubmit – error ───────────────────────────────────────────────────────

  describe('onSubmit() error path', () => {
    beforeEach(() => {
      component.form.setValue(VALID_PAYLOAD);
    });

    it('sets errorMessage from server error.message', () => {
      authSpy.register.mockReturnValue(
        throwError(() => ({ error: { message: 'Email already in use.' } }))
      );
      component.onSubmit();
      expect(component.errorMessage).toBe('Email already in use.');
    });

    it('falls back to generic message when error has no message property', () => {
      authSpy.register.mockReturnValue(throwError(() => ({})));
      component.onSubmit();
      expect(component.errorMessage).toBe('Registration failed. Please try again.');
    });

    it('falls back to generic message when error is null', () => {
      authSpy.register.mockReturnValue(throwError(() => null));
      component.onSubmit();
      expect(component.errorMessage).toBe('Registration failed. Please try again.');
    });

    it('resets loading to false on error', () => {
      authSpy.register.mockReturnValue(
        throwError(() => ({ error: { message: 'Server error' } }))
      );
      component.onSubmit();
      expect(component.loading).toBe(false);
    });

    it('does not navigate on error', () => {
      authSpy.register.mockReturnValue(
        throwError(() => ({ error: { message: 'Server error' } }))
      );
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('clears successMessage on error', () => {
      component.successMessage = 'some success';
      authSpy.register.mockReturnValue(
        throwError(() => ({ error: { message: 'Oops' } }))
      );
      component.onSubmit();
      expect(component.successMessage).toBe('');
    });
  });

  // ── loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('sets loading=true while request is in flight', () => {
      component.form.setValue(VALID_PAYLOAD);
      const pending = new Subject<never>();
      authSpy.register.mockReturnValue(pending.asObservable());

      component.onSubmit();
      expect(component.loading).toBe(true);
    });
  });

  // ── dateOfBirth string passthrough ────────────────────────────────────────

  describe('dateOfBirth already a string', () => {
    it('passes through a pre-formatted string without re-serialising', () => {
      component.form.setValue({ ...VALID_PAYLOAD, dateOfBirth: '1990-01-15' as any });
      authSpy.register.mockReturnValue(of({} as any));
      component.onSubmit();
      const payload = authSpy.register.mock.calls[0][0];
      expect(payload.dateOfBirth).toBe('1990-01-15');
    });
  });
});
