import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, WITH_CREDENTIALS } from '../api.config';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  roleId: number;
}

export interface RoleResponseDto {
  id: number;
  name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string | null;
  role: RoleResponseDto | null;
  roles: RoleResponseDto[];
  verificationStatusId: number | null;
  activeStatusId: number | null;
  emailVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailResponse {
  message: string;
  emailVerified: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${API_BASE_URL}/api/user`;

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/register`, data, WITH_CREDENTIALS);
  }

  login(data: LoginRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/login`, data, WITH_CREDENTIALS);
  }

  /** POST /api/user/refresh-token — rotates the refresh_token cookie and re-issues jwt_token. */
  refreshToken(): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/refresh-token`, {}, WITH_CREDENTIALS);
  }

  /** POST /api/user/revoke-token — invalidates the refresh token server-side and clears both cookies. */
  revokeToken(): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/revoke-token`, {}, WITH_CREDENTIALS);
  }

  /** GET /api/user/{id} — fetch a user's public profile by id. */
  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`, WITH_CREDENTIALS);
  }

  /** POST /api/user/become-owner — adds the Owner role to the current user. */
  becomeOwner(): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/become-owner`, {}, WITH_CREDENTIALS);
  }

  /** GET /api/user/verify-email/{hash} — confirms the email address tied to the verification hash. */
  verifyEmail(hash: string): Observable<VerifyEmailResponse> {
    return this.http.get<VerifyEmailResponse>(`${this.baseUrl}/verify-email/${hash}`, WITH_CREDENTIALS);
  }

  /** POST /api/user/resend-verification — issues a new verification hash and re-sends the email. */
  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/resend-verification`, { email }, WITH_CREDENTIALS);
  }

  /** POST /api/user/forgot-password — sends a password reset link if the email is registered. */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email }, WITH_CREDENTIALS);
  }

  /** POST /api/user/reset-password — sets a new password using the emailed reset token. */
  resetPassword(data: { token: string; newPassword: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, data, WITH_CREDENTIALS);
  }
}
