import { UserResponse } from '../../core/services/auth.service';

export interface AuthState {
  user: UserResponse | null;
  loading: boolean;
  error: string | null;
  emailNotVerified: boolean;
  pendingEmail: string | null;
}

export const initialAuthState: AuthState = {
  user: null,
  loading: false,
  error: null,
  emailNotVerified: false,
  pendingEmail: null,
};
