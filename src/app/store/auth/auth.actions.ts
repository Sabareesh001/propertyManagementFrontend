import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { LoginRequest, UserResponse } from '../../core/services/auth.service';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Login': props<{ credentials: LoginRequest }>(),
    'Login Success': props<{ user: UserResponse }>(),
    'Login Failure': props<{ error: string }>(),
    'Logout': emptyProps(),
  },
});
