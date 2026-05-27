import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError } from 'rxjs';

/** Key used to persist the JWT access token in localStorage. */
const ACCESS_TOKEN_KEY = 'lembas_access_token';

/** Key used to persist the JWT refresh token in localStorage. */
const REFRESH_TOKEN_KEY = 'lembas_refresh_token';

/** Key used to persist the user's first name in localStorage (JWT does not carry it). */
const FIRST_NAME_KEY = 'lembas_user_first_name';

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
 * Claims embedded in the JWT access token payload.
 *
 * <p>Matches the backend's {@link JwtTokenProvider#createAccessToken} output
 * (subject = user ID, plus email, role, and tokenType claims).</p>
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tokenType: string;
  iat: number;
  exp: number;
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

/** Request payload for POST /api/auth/refresh. */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Decodes the base64url-encoded payload section of a JWT.
 *
 * <p>No signature verification is performed; the function only extracts and
 * JSON-parses the middle segment of a standard {@code header.payload.signature}
 * JWT. The server is responsible for signature validation on the backend.</p>
 *
 * <p>Returns {@code null} when the token is malformed, not a valid JWT, or
 * when the payload fails to parse as valid JSON.</p>
 *
 * @param token a raw JWT string
 * @returns the parsed payload as any JSON value, or null
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const segments = token.split('.');
    if (segments.length !== 3) {
      return null;
    }
    // Decode base64url -> base64 -> UTF-8
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload: JwtPayload = JSON.parse(json);

    // Validate required claims are present
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Authentication service for register/login and token management.
 *
 * <p>Exposes methods for the public registration and login flows.
 * All HTTP calls go through the configured {@link HttpClient}.</p>
 *
 * <p>Only the JWT access token and refresh token are persisted in
 * {@code localStorage}. Basic user data (id, email, role) is reconstructed
 * at hydration time by decoding the JWT payload -- no separate user object is
 * stored. Full user details (firstName, lastName, branchId, branchName)
 * from the login/register response are kept in memory only for the current
 * session.</p>
 *
 * <p>The access token is read by {@code AuthInterceptor} and attached to every
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
    const storedRefreshToken = storedToken ? this.loadStoredRefreshToken() : null;
    const hydratedUser = storedToken ? this.buildUserFromToken(storedToken) : null;

    this.accessToken = signal<string | null>(hydratedUser ? storedToken : null);
    this.refreshToken = signal<string | null>(hydratedUser ? storedRefreshToken : null);
    this.currentUser = signal<AuthUser | null>(hydratedUser);

    // If the stored token is invalid or produces no user data, clear stale data.
    if (storedToken && !hydratedUser) {
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
   * Exchanges the stored refresh token for a rotated token pair.
   *
   * <p>The backend invalidates the presented refresh token and returns a new
   * access token plus a replacement refresh token. The response is persisted
   * immediately so subsequent requests use the fresh credentials.</p>
   *
   * @returns an Observable emitting the rotated authentication response
   */
  refreshSession(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshTokenRequest = { refreshToken };
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh`, request)
      .pipe(tap((response) => this.saveAuthResponse(response)));
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

  /** Returns the current refresh token, or null if none is available. */
  getRefreshToken(): string | null {
    return this.refreshToken();
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
   * <p>Only the JWT tokens are written to localStorage. The user object is kept
   * in memory only; on the next page load it is reconstructed from the JWT payload
   * via {@link #buildUserFromToken}.</p>
   *
   * @param response the {@link AuthResponse} returned from register or login
   */
  saveAuthResponse(response: AuthResponse): void {
    this.persistToken(response.token);
    if (response.refreshToken) {
      this.persistRefreshToken(response.refreshToken);
      this.refreshToken.set(response.refreshToken);
    }
    this.accessToken.set(response.token);
    this.currentUser.set(response.user);
    this.persistFirstName(response.user.firstName);
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
   * Reconstructs a minimal {@link AuthUser} from JWT claims.
   *
   * <p>Only {@code id}, {@code email}, and {@code role} are available from the
   * JWT payload. {@code firstName}, {@code lastName}, {@code branchId}, and
   * {@code branchName} are set to null because the JWT does not carry them.
   * Components that need the full name should fetch {@code GET /api/auth/me}
   * after hydration.</p>
   *
   * @param token a raw JWT access token
   * @returns a minimal AuthUser, or null if the token is invalid
   */
  private buildUserFromToken(token: string): AuthUser | null {
    const payload = decodeJwtPayload(token);
    if (!payload) {
      return null;
    }

    // Only ACCESS tokens carry email + role claims
    if (payload.tokenType !== 'ACCESS') {
      return null;
    }

    const userId = Number(payload.sub);
    if (isNaN(userId)) {
      return null;
    }

    const role = payload.role as AuthUser['role'];
    if (!['ADMIN', 'MANAGER', 'EMPLOYEE', 'CUSTOMER'].includes(role)) {
      return null;
    }

    return {
      id: userId,
      email: payload.email,
      firstName: this.loadStoredFirstName(),
      lastName: null,
      role,
      branchId: null,
      branchName: null,
    };
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

  /** Removes all auth-related entries from {@code localStorage}. */
  private removePersistedAuth(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(FIRST_NAME_KEY);
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

  /** Persists the user's first name to {@code localStorage}. */
  private persistFirstName(firstName: string | null): void {
    try {
      if (firstName) {
        localStorage.setItem(FIRST_NAME_KEY, firstName);
      } else {
        localStorage.removeItem(FIRST_NAME_KEY);
      }
    } catch {
      /* Storage unavailable -- degrade gracefully */
    }
  }

  /** Loads the stored first name on service construction. */
  private loadStoredFirstName(): string | null {
    try {
      return localStorage.getItem(FIRST_NAME_KEY);
    } catch {
      return null;
    }
  }
}
