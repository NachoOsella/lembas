import { Injectable, signal, computed, WritableSignal } from '@angular/core';
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

  /** Currently authenticated user, or null if not logged in. */
  readonly currentUser: WritableSignal<AuthUser | null> = signal<AuthUser | null>(null);

  /** Whether a user is currently authenticated. */
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

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

  /**
   * Persists the authentication response (tokens and user) into the service state.
   *
   * @param response the {@link AuthResponse} returned from register or login
   */
  saveAuthResponse(response: AuthResponse): void {
    this.currentUser.set(response.user);
  }

  /**
   * Clears the current authentication state (logout).
   */
  clearAuth(): void {
    this.currentUser.set(null);
  }
}
