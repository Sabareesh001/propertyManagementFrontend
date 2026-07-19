import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthActions } from './auth.actions';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notifications = inject(NotificationService);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ credentials }) =>
        this.auth.login(credentials).pipe(
          map((user) => AuthActions.loginSuccess({ user })),
          catchError((err) => {
            const emailNotVerified = err?.error?.errorCode === 'EMAIL_NOT_VERIFIED';
            return of(AuthActions.loginFailure({
              error: err?.error?.message ?? 'Invalid email or password.',
              emailNotVerified,
            }));
          }),
        ),
      ),
    ),
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        tap(({ user }) => {
          localStorage.setItem('auth_user', JSON.stringify(user));
          const isAdmin = user.roles?.some((r) => r.id === 3);
          this.router.navigate([isAdmin ? '/admin/verifications/property' : '/dashboard']);
          this.notifications.connect();
          this.notifications.loadMyNotifications();
        }),
      ),
    { dispatch: false },
  );

  restoreSession$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.restoreSession),
        tap(() => {
          this.notifications.connect();
          this.notifications.loadMyNotifications();
        }),
      ),
    { dispatch: false },
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        switchMap(() =>
          this.auth.revokeToken().pipe(
            catchError(() => of(null)),
          ),
        ),
        tap(() => {
          localStorage.removeItem('auth_user');
          this.notifications.disconnect();
          this.router.navigate(['/auth/login']);
        }),
      ),
    { dispatch: false },
  );
}
