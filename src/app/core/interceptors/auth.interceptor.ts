import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthActions } from '../../store/auth/auth.actions';

const IS_RETRY = new HttpContextToken(() => false);

// Endpoints that must not trigger a refresh-and-retry cycle themselves.
const SKIP_REFRESH_PATTERN = /\/api\/user\/(login|refresh-token|revoke-token)$/;

let isRefreshing = false;
const refreshedSubject = new BehaviorSubject<boolean | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: unknown) => {
      const isExpiredTokenError =
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !SKIP_REFRESH_PATTERN.test(req.url) &&
        !req.context.get(IS_RETRY);

      if (!isExpiredTokenError) {
        return throwError(() => err);
      }

      const retriedReq = req.clone({ context: req.context.set(IS_RETRY, true) });

      if (!isRefreshing) {
        isRefreshing = true;
        refreshedSubject.next(null);

        return auth.refreshToken().pipe(
          switchMap(() => {
            isRefreshing = false;
            refreshedSubject.next(true);
            return next(retriedReq);
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            refreshedSubject.next(false);
            store.dispatch(AuthActions.logout());
            return throwError(() => refreshErr);
          }),
        );
      }

      return refreshedSubject.pipe(
        filter((ready) => ready !== null),
        take(1),
        switchMap((success) => (success ? next(retriedReq) : throwError(() => err))),
      );
    }),
  );
};
