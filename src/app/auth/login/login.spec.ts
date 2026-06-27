import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoginComponent } from './login';
import { AuthService } from '../../core/services/auth.service';

// ─── helpers ─────────────────────────────────────────────────────────────────

function createAuthServiceSpy() {
  return { login: vi.fn() };
}

function createRouterSpy() {
  return { navigate: vi.fn() };
}

// ─── suite ───────────────────────────────────────────────────────────────────

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authSpy: ReturnType<typeof createAuthServiceSpy>;
  let routerSpy: ReturnType<typeof createRouterSpy>;

  beforeEach(async () => {
    authSpy = createAuthServiceSpy();
    routerSpy = createRouterSpy();

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: {}, params: of({}), queryParams: of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('creates the component', () => {
      expect(component).toBeTruthy();
    });

    it('form is invalid on load (all fields empty)', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('loading starts as false', () => {
      expect(component.loading).toBe(false);
    });

    it('errorMessage starts as empty string', () => {
      expect(component.errorMessage).toBe('');
    });

    it('email field starts empty', () => {
      expect(component.f.email.value).toBe('');
    });

    it('password field starts empty', () => {
      expect(component.f.password.value).toBe('');
    });
  });

  // ── fieldError() ──────────────────────────────────────────────────────────

  describe('fieldError()', () => {
    it('returns empty string when email is untouched', () => {
      expect(component.fieldError('email')).toBe('');
    });

    it('returns empty string when password is untouched', () => {
      expect(component.fieldError('password')).toBe('');
    });

    it('returns empty string when email is valid and touched', () => {
      component.f.email.setValue('user@example.com');
      component.f.email.markAsTouched();
      expect(component.fieldError('email')).toBe('');
    });

    it('returns empty string when password is valid and touched', () => {
      component.f.password.setValue('anypassword');
      component.f.password.markAsTouched();
      expect(component.fieldError('password')).toBe('');
    });

    it('returns required message when email is touched and empty', () => {
      component.f.email.setValue('');
      component.f.email.markAsTouched();
      expect(component.fieldError('email')).toBe('This field is required.');
    });

    it('returns required message when password is touched and empty', () => {
      component.f.password.setValue('');
      component.f.password.markAsTouched();
      expect(component.fieldError('password')).toBe('This field is required.');
    });

    it('returns email format message for an invalid email', () => {
      component.f.email.setValue('not-an-email');
      component.f.email.markAsTouched();
      expect(component.fieldError('email')).toBe('Enter a valid email address.');
    });

    it('returns email format message when email has no domain', () => {
      component.f.email.setValue('user@');
      component.f.email.markAsTouched();
      expect(component.fieldError('email')).toBe('Enter a valid email address.');
    });

    it('returns email format message when email has no @', () => {
      component.f.email.setValue('userexample.com');
      component.f.email.markAsTouched();
      expect(component.fieldError('email')).toBe('Enter a valid email address.');
    });
  });

  // ── email field validation ─────────────────────────────────────────────────

  describe('email field', () => {
    it('is invalid when empty', () => {
      component.f.email.setValue('');
      expect(component.f.email.invalid).toBe(true);
    });

    it('is invalid for a plain string with no @', () => {
      component.f.email.setValue('userexample.com');
      expect(component.f.email.invalid).toBe(true);
    });

    it('is invalid without a domain after @', () => {
      component.f.email.setValue('user@');
      expect(component.f.email.invalid).toBe(true);
    });

    it('is valid for a standard email', () => {
      component.f.email.setValue('user@example.com');
      expect(component.f.email.valid).toBe(true);
    });

    it('is valid with subdomain', () => {
      component.f.email.setValue('user@mail.example.co.uk');
      expect(component.f.email.valid).toBe(true);
    });

    it('is valid with plus-addressing', () => {
      component.f.email.setValue('user+alias@example.com');
      expect(component.f.email.valid).toBe(true);
    });
  });

  // ── password field validation ──────────────────────────────────────────────

  describe('password field', () => {
    it('is invalid when empty', () => {
      component.f.password.setValue('');
      expect(component.f.password.invalid).toBe(true);
    });

    it('is valid for any non-empty string', () => {
      component.f.password.setValue('anypassword');
      expect(component.f.password.valid).toBe(true);
    });

    it('is valid for a single character', () => {
      component.f.password.setValue('x');
      expect(component.f.password.valid).toBe(true);
    });

    it('is valid for a password with special characters', () => {
      component.f.password.setValue('P@ssw0rd!');
      expect(component.f.password.valid).toBe(true);
    });
  });

  // ── onSubmit() – invalid form ──────────────────────────────────────────────

  describe('onSubmit() with invalid form', () => {
    it('marks all controls as touched', () => {
      component.onSubmit();
      Object.values(component.form.controls).forEach(ctrl => {
        expect(ctrl.touched).toBe(true);
      });
    });

    it('does not call auth.login when form is invalid', () => {
      component.onSubmit();
      expect(authSpy.login).not.toHaveBeenCalled();
    });

    it('does not set loading=true when form is invalid', () => {
      component.onSubmit();
      expect(component.loading).toBe(false);
    });

    it('does not clear errorMessage when form is invalid', () => {
      component.errorMessage = 'previous error';
      component.onSubmit();
      expect(component.errorMessage).toBe('previous error');
    });

    it('does not navigate when email is empty', () => {
      component.f.password.setValue('secret');
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('does not navigate when password is empty', () => {
      component.f.email.setValue('user@example.com');
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('does not navigate when email format is invalid', () => {
      component.f.email.setValue('bad-email');
      component.f.password.setValue('secret');
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  // ── onSubmit() – success ───────────────────────────────────────────────────

  describe('onSubmit() success path', () => {
    beforeEach(() => {
      component.f.email.setValue('user@example.com');
      component.f.password.setValue('correctpassword');
      authSpy.login.mockReturnValue(of({ id: 1, email: 'user@example.com' } as any));
    });

    it('calls auth.login once', () => {
      component.onSubmit();
      expect(authSpy.login).toHaveBeenCalledOnce();
    });

    it('calls auth.login with email and password', () => {
      component.onSubmit();
      expect(authSpy.login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'correctpassword',
      });
    });

    it('navigates to /dashboard on success', () => {
      component.onSubmit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('resets loading to false after success', () => {
      component.onSubmit();
      expect(component.loading).toBe(false);
    });

    it('clears errorMessage on success', () => {
      component.errorMessage = 'previous error';
      component.onSubmit();
      expect(component.errorMessage).toBe('');
    });
  });

  // ── onSubmit() – error ─────────────────────────────────────────────────────

  describe('onSubmit() error path', () => {
    beforeEach(() => {
      component.f.email.setValue('user@example.com');
      component.f.password.setValue('wrongpassword');
    });

    it('sets errorMessage from server error.message', () => {
      authSpy.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid credentials.' } }))
      );
      component.onSubmit();
      expect(component.errorMessage).toBe('Invalid credentials.');
    });

    it('falls back to generic message when error has no message property', () => {
      authSpy.login.mockReturnValue(throwError(() => ({})));
      component.onSubmit();
      expect(component.errorMessage).toBe('Invalid email or password.');
    });

    it('falls back to generic message when error.error is undefined', () => {
      authSpy.login.mockReturnValue(throwError(() => ({ error: undefined })));
      component.onSubmit();
      expect(component.errorMessage).toBe('Invalid email or password.');
    });

    it('falls back to generic message when error is null', () => {
      authSpy.login.mockReturnValue(throwError(() => null));
      component.onSubmit();
      expect(component.errorMessage).toBe('Invalid email or password.');
    });

    it('resets loading to false on error', () => {
      authSpy.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Unauthorized' } }))
      );
      component.onSubmit();
      expect(component.loading).toBe(false);
    });

    it('does not navigate on error', () => {
      authSpy.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Unauthorized' } }))
      );
      component.onSubmit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('uses server message verbatim (401 scenario)', () => {
      authSpy.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid email or password.' } }))
      );
      component.onSubmit();
      expect(component.errorMessage).toBe('Invalid email or password.');
    });
  });

  // ── loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('sets loading=true while the request is in flight', () => {
      component.f.email.setValue('user@example.com');
      component.f.password.setValue('correctpassword');
      const pending = new Subject<never>();
      authSpy.login.mockReturnValue(pending.asObservable());

      component.onSubmit();
      expect(component.loading).toBe(true);
    });

    it('resets loading=false once the request completes', () => {
      component.f.email.setValue('user@example.com');
      component.f.password.setValue('correctpassword');
      const pending = new Subject<any>();
      authSpy.login.mockReturnValue(pending.asObservable());

      component.onSubmit();
      expect(component.loading).toBe(true);

      pending.next({ id: 1 });
      pending.complete();
      expect(component.loading).toBe(false);
    });

    it('resets loading=false when the request errors', () => {
      component.f.email.setValue('user@example.com');
      component.f.password.setValue('wrongpassword');
      const pending = new Subject<never>();
      authSpy.login.mockReturnValue(pending.asObservable());

      component.onSubmit();
      expect(component.loading).toBe(true);

      pending.error({ error: { message: 'Unauthorized' } });
      expect(component.loading).toBe(false);
    });

    it('clears errorMessage at the start of a new submission', () => {
      component.f.email.setValue('user@example.com');
      component.f.password.setValue('correctpassword');
      component.errorMessage = 'stale error';
      authSpy.login.mockReturnValue(of({} as any));

      component.onSubmit();
      expect(component.errorMessage).toBe('');
    });
  });
});
