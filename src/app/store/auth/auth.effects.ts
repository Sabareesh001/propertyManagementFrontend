import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AuthActions } from './auth.actions';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private auth = inject(AuthService);
  private router = inject(Router);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ credentials }) =>
        this.auth.login(credentials).pipe(
          map((user) => AuthActions.loginSuccess({ user })),
          catchError((err) =>
            of(AuthActions.loginFailure({ error: err?.error?.message ?? 'Invalid email or password.' }))
          ),
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
        }),
      ),
    { dispatch: false },
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
          localStorage.removeItem('auth_user');
          document.cookie = 'jwt_token=; Max-Age=0; path=/';
          this.router.navigate(['/auth/login']);
        }),
      ),
    { dispatch: false },
  );
}
