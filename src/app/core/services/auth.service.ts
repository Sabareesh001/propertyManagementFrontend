import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  roleId: number;
}

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleId: number;
  isVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:5104/api/user';

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/login`, data, { withCredentials: true });
  }
}
