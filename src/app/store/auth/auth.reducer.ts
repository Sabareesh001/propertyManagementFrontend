import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthState, initialAuthState } from './auth.state';

export const authReducer = createReducer(
  initialAuthState,

  on(AuthActions.login, (state): AuthState => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(AuthActions.loginSuccess, (state, { user }): AuthState => ({
    ...state,
    user,
    loading: false,
    error: null,
  })),

  on(AuthActions.loginFailure, (state, { error }): AuthState => ({
    ...state,
    loading: false,
    error,
  })),

  on(AuthActions.logout, (): AuthState => initialAuthState),
);
