import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectCurrentUser = createSelector(selectAuthState, (s) => s.user);
export const selectIsLoggedIn = createSelector(selectAuthState, (s) => s.user !== null);
export const selectAuthLoading = createSelector(selectAuthState, (s) => s.loading);
export const selectAuthError = createSelector(selectAuthState, (s) => s.error);
export const selectUserRole = createSelector(selectAuthState, (s) => s.user?.roleId ?? null);
