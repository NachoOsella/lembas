import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Request payload for POST /api/auth/register. */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string | null;
}

/** User DTO returned inside an AuthResponse. */
export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER';
  branchId?: number | null;
  branchName?: string | null;
}

/** Response from POST /api/auth/register and POST /api/auth/login. */
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Authentication service for register/login and token management.
 *
 * <p>Exposes methods for the public registration and login flows.
 * All HTTP calls go through the configured {@link HttpClient}.</p>
 */
@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly apiUrl = '/api/auth';

  constructor(private readonly http: HttpClient) {}

  /**
   * Registers a new customer account.
   *
   * @param request the registration payload
   * @returns an {@link Observable} emitting the {@link AuthResponse} with JWT tokens
   */
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, request);
  }
}
