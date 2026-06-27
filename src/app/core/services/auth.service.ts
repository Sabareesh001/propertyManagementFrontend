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
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${API_BASE_URL}/api/user`;

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/login`, data, WITH_CREDENTIALS);
  }

  /** POST /api/user/become-owner — adds the Owner role to the current user. */
  becomeOwner(): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/become-owner`, {}, WITH_CREDENTIALS);
  }
}
