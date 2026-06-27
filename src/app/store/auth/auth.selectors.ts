import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectCurrentUser = createSelector(selectAuthState, (s) => s.user);
export const selectIsLoggedIn = createSelector(selectAuthState, (s) => s.user !== null);
export const selectAuthLoading = createSelector(selectAuthState, (s) => s.loading);
export const selectAuthError = createSelector(selectAuthState, (s) => s.error);
export const selectUserRoles = createSelector(selectAuthState, (s) => s.user?.roles ?? []);
export const selectIsOwner = createSelector(selectUserRoles, (roles) => roles.some((r) => r.id === 2));
export const selectIsAdmin = createSelector(selectUserRoles, (roles) => roles.some((r) => r.id === 3));
