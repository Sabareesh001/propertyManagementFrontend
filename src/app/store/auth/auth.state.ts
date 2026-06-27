import { UserResponse } from '../../core/services/auth.service';

export interface AuthState {
  user: UserResponse | null;
  loading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  user: null,
  loading: false,
  error: null,
};
