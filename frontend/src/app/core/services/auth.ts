import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, map, of, shareReplay, tap } from 'rxjs';

/** Request payload for POST /api/auth/register. */
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string | null;
}

/** Request payload for POST /api/auth/login. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** User DTO returned inside an AuthResponse. */
export interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER';
  branchId?: number | null;
  branchName?: string | null;
}

/**
 * Response from auth endpoints.
 *
 * <p>Token fields are optional because production auth uses HttpOnly cookies;
 * the JSON body carries only non-sensitive user details.</p>
 */
export interface AuthResponse {
  token?: string | null;
  refreshToken?: string | null;
  user: AuthUser;
}

/** Authentication service backed by server-managed HttpOnly JWT cookies. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private readonly currentUserState = signal<AuthUser | null>(null);
  private readonly sessionChecked = signal(false);
  private sessionRequest$: Observable<boolean> | null = null;
  private readonly http = inject(HttpClient);

  /** Currently authenticated user, or null if not logged in. */
  readonly currentUser = this.currentUserState.asReadonly();

  /** Whether a user is currently authenticated in this browser session. */
  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  /** Registers a customer and stores the returned user while cookies are set by the backend. */
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, request)
      .pipe(tap((response) => this.saveAuthResponse(response)));
  }

  /** Logs in and stores the returned user while cookies are set by the backend. */
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, request)
      .pipe(tap((response) => this.saveAuthResponse(response)));
  }

  /** Rotates the refresh cookie and stores the fresh user returned by the backend. */
  refreshSession(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh`, {})
      .pipe(tap((response) => this.saveAuthResponse(response)));
  }

  /**
   * Clears the in-memory auth state immediately so subsequent route guards see
   * the user as unauthenticated, then fires the backend logout request to clear
   * the HttpOnly cookies. Returns an Observable so callers can await the HTTP
   * call if they need to (the local state is always cleared synchronously).
   */
  logout(): Observable<void> {
    // Clear in-memory state synchronously so guest guards don't see a stale
    // authenticated user and bounce the navigation back to the dashboard.
    this.clearAuth();
    return this.http.post<void>(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of(undefined)),
      map(() => undefined),
    );
  }

  /** Returns whether the current in-memory session is authenticated. */
  isAuthenticatedSync(): boolean {
    return this.isAuthenticated();
  }

  /** Returns the role of the current user, or null when unauthenticated. */
  getUserRole(): AuthUser['role'] | null {
    return this.currentUserState()?.role ?? null;
  }

  /**
   * Ensures auth state is hydrated from HttpOnly cookies before a guard decides.
   *
   * <p>Because cookies cannot be read from JavaScript, a page reload starts with
   * unknown auth state. This method calls GET /api/auth/me once and caches the
   * negative result until login/register/refresh changes the state.</p>
   */
  ensureSession(): Observable<boolean> {
    if (this.currentUserState()) {
      return of(true);
    }
    if (this.sessionChecked()) {
      return of(false);
    }
    if (!this.sessionRequest$) {
      this.sessionRequest$ = this.http.get<AuthResponse>(`${this.apiUrl}/me`).pipe(
        tap((response) => this.saveAuthResponse(response)),
        map(() => true),
        catchError(() => {
          this.clearAuth();
          return of(false);
        }),
        tap(() => {
          this.sessionRequest$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.sessionRequest$;
  }

  /** Stores the non-sensitive authenticated user returned by the backend. */
  saveAuthResponse(response: AuthResponse): void {
    this.currentUserState.set(response.user);
    this.sessionChecked.set(true);
  }

  /** Clears in-memory auth state. HttpOnly cookies are cleared by the backend logout endpoint. */
  clearAuth(): void {
    this.currentUserState.set(null);
    this.sessionChecked.set(true);
  }

  /** Compatibility shim: tokens are HttpOnly and intentionally unavailable to JavaScript. */
  getAccessToken(): string | null {
    return null;
  }

  /** Compatibility shim: refresh tokens are HttpOnly and intentionally unavailable to JavaScript. */
  getRefreshToken(): string | null {
    return null;
  }
}
