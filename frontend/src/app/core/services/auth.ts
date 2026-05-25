import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Key used to persist the JWT access token in localStorage. */
const ACCESS_TOKEN_KEY = 'lembas_access_token';

/** Key used to persist the JWT refresh token in localStorage. */
const REFRESH_TOKEN_KEY = 'lembas_refresh_token';

/** Key used to persist the authenticated user in localStorage. */
const USER_KEY = 'lembas_user';

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
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER';
  branchId?: number | null;
  branchName?: string | null;
}

/** Field-level validation error returned inside ApiError.details.fieldErrors. */
export interface ApiFieldError {
  field: string;
  message: string;
}

/** Standard backend API error payload. */
export interface ApiErrorResponse {
  status: number;
  code: string;
  message: string;
  details?: {
    fieldErrors?: ApiFieldError[];
  } | null;
  timestamp?: string;
  path?: string;
}

/** Response from POST /api/auth/register and POST /api/auth/login. */
export interface AuthResponse {
  token: string;
  refreshToken?: string | null;
  user: AuthUser;
}

/**
 * Authentication service for register/login and token management.
 *
 * <p>Exposes methods for the public registration and login flows.
 * All HTTP calls go through the configured {@link HttpClient}.</p>
 *
 * <p>The JWT access token, refresh token, and authenticated user are persisted
 * in {@code localStorage} so the session survives full-page reloads.
 * The access token is read by {@code AuthInterceptor} and attached to every
 * outgoing HTTP request via the {@code Authorization: Bearer} header.</p>
 *
 * <p>Public API: {@link register} / {@link login} for server-side auth,
 * {@link logout} / {@link getAccessToken} / {@link isAuthenticated} / {@link getUserRole}
 * for client-side auth state.</p>
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = '/api/auth';

  /** Current JWT access token, or null if not logged in. */
  private readonly accessToken: WritableSignal<string | null>;

  /** Current JWT refresh token, or null if not logged in. */
  private readonly refreshToken: WritableSignal<string | null>;

  /** Currently authenticated user, or null if not logged in. */
  readonly currentUser: WritableSignal<AuthUser | null>;

  /** Whether a user is currently authenticated. */
  readonly isAuthenticated = computed(
    () => this.currentUser() !== null && this.accessToken() !== null,
  );

  constructor(private readonly http: HttpClient) {
    const storedToken = this.loadStoredToken();
    const storedUser = storedToken ? this.loadStoredUser() : null;
    const storedRefreshToken = storedUser ? this.loadStoredRefreshToken() : null;

    this.accessToken = signal<string | null>(storedUser ? storedToken : null);
    this.refreshToken = signal<string | null>(storedUser ? storedRefreshToken : null);
    this.currentUser = signal<AuthUser | null>(storedUser);

    // If either part of the persisted session is missing or invalid, clear stale data.
    if (!storedToken || !storedUser) {
      this.removePersistedAuth();
    }
  }

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
   * Authenticates an existing user account.
   *
   * @param request the login credentials
   * @returns an {@link Observable} emitting the {@link AuthResponse} with JWT tokens
   */
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request);
  }

  /**
   * Logs out the current user by clearing all auth state and persisted data.
   *
   * <p>Stateless JWT logout: tokens are simply removed client-side. No backend
   * call is needed since the server does not maintain a session or token blacklist.</p>
   */
  logout(): void {
    this.clearAuth();
  }

  /**
   * Returns the current JWT access token, or null if the user is not authenticated.
   *
   * @returns the stored access token string, or null
   */
  getAccessToken(): string | null {
    return this.accessToken();
  }

  /**
   * Returns whether a user is currently authenticated.
   *
   * @returns true when both the current user and access token are present
   */
  isAuthenticatedSync(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Returns the role of the currently authenticated user, or null if not logged in.
   *
   * @returns the user role ({@code ADMIN}, {@code MANAGER}, {@code EMPLOYEE}, {@code CUSTOMER}), or null
   */
  getUserRole(): AuthUser['role'] | null {
    return this.currentUser()?.role ?? null;
  }

  /**
   * Persists the authentication response (tokens and user) into the service state
   * and {@code localStorage} so the session survives full-page reloads.
   *
   * @param response the {@link AuthResponse} returned from register or login
   */
  saveAuthResponse(response: AuthResponse): void {
    this.persistToken(response.token);
    if (response.refreshToken) {
      this.persistRefreshToken(response.refreshToken);
      this.refreshToken.set(response.refreshToken);
    }
    this.persistUser(response.user);
    this.accessToken.set(response.token);
    this.currentUser.set(response.user);
  }

  /**
   * Clears the current authentication state and removes all persisted data (logout).
   */
  clearAuth(): void {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    this.removePersistedAuth();
  }

  /**
   * Persists the access token to {@code localStorage}.
   * Wrapped so unit tests can operate without a real localStorage.
   */
  private persistToken(token: string): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } catch {
      /* Storage unavailable (e.g. private browsing quota exceeded) -- degrade gracefully */
    }
  }

  /** Persists the refresh token to {@code localStorage}. */
  private persistRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      /* Storage unavailable -- degrade gracefully */
    }
  }

  /** Persists the authenticated user to {@code localStorage}. */
  private persistUser(user: AuthUser): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* Storage unavailable -- degrade gracefully */
    }
  }

  /** Removes all auth-related entries from {@code localStorage}. */
  private removePersistedAuth(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* Storage unavailable -- degrade gracefully */
    }
  }

  /** Loads the stored access token on service construction. */
  private loadStoredToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /** Loads the stored refresh token on service construction. */
  private loadStoredRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /** Hydrates the stored user on service construction. */
  private loadStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<AuthUser>;

      // Validate the shape of the persisted user before using it.
      const branchIdValid =
        parsed.branchId === undefined ||
        parsed.branchId === null ||
        typeof parsed.branchId === 'number';
      const branchNameValid =
        parsed.branchName === undefined ||
        parsed.branchName === null ||
        typeof parsed.branchName === 'string';

      if (
        typeof parsed.id !== 'number' ||
        typeof parsed.email !== 'string' ||
        typeof parsed.firstName !== 'string' ||
        typeof parsed.lastName !== 'string' ||
        !['ADMIN', 'MANAGER', 'EMPLOYEE', 'CUSTOMER'].includes(parsed.role ?? '') ||
        !branchIdValid ||
        !branchNameValid
      ) {
        this.removePersistedAuth();
        return null;
      }

      return parsed as AuthUser;
    } catch {
      this.removePersistedAuth();
      return null;
    }
  }
}
