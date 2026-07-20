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

  const getAuthReq = (request: typeof req) => {
    const token = localStorage.getItem('jwt_token');
    if (token && !request.headers.has('Authorization')) {
      return request.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
    return request;
  };

  const authReq = getAuthReq(req);

  return next(authReq).pipe(
    catchError((err: unknown) => {
      const isExpiredTokenError =
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !SKIP_REFRESH_PATTERN.test(req.url) &&
        !req.context.get(IS_RETRY);

      if (!isExpiredTokenError) {
        return throwError(() => err);
      }

      const getRetriedReq = () => {
        const base = req.clone({ context: req.context.set(IS_RETRY, true) });
        return getAuthReq(base);
      };

      if (!isRefreshing) {
        isRefreshing = true;
        refreshedSubject.next(null);

        return auth.refreshToken().pipe(
          switchMap((res) => {
            isRefreshing = false;
            const newToken = res?.token ?? res?.accessToken ?? res?.jwtToken;
            if (newToken) {
              localStorage.setItem('jwt_token', newToken);
            }
            refreshedSubject.next(true);
            return next(getRetriedReq());
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            refreshedSubject.next(false);
            localStorage.removeItem('jwt_token');
            store.dispatch(AuthActions.logout());
            return throwError(() => refreshErr);
          }),
        );
      }

      return refreshedSubject.pipe(
        filter((ready) => ready !== null),
        take(1),
        switchMap((success) => (success ? next(getRetriedReq()) : throwError(() => err))),
      );
    }),
  );
};
