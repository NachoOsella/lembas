import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthResponse, AuthService } from '../services/auth';

/** Shared refresh request so parallel 401 responses trigger only one rotation. */
let refreshInFlight$: Observable<AuthResponse> | null = null;

/** Returns true when the request targets the backend API. */
function isBackendApiRequest(url: string): boolean {
  return url.startsWith('/api/');
}

/** Returns true for auth endpoints that must never receive stale access tokens. */
function isPublicAuthRequest(url: string): boolean {
  return url === '/api/auth/login' || url === '/api/auth/register' || url === '/api/auth/refresh';
}

/** Returns true when a failed response can be retried after token rotation. */
function canAttemptRefresh(req: HttpRequest<unknown>, error: HttpErrorResponse): boolean {
  return error.status === 401 && isBackendApiRequest(req.url) && !isPublicAuthRequest(req.url);
}

/** Clones a request with the latest access token, preserving existing headers. */
function withBearerToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/** Returns a shared refresh observable, creating it only once while refresh is in flight. */
function getOrStartRefresh(authService: AuthService): Observable<AuthResponse> {
  if (!refreshInFlight$) {
    refreshInFlight$ = authService.refreshSession().pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      finalize(() => {
        refreshInFlight$ = null;
      }),
    );
  }
  return refreshInFlight$;
}

/**
 * Attaches JWT access tokens to backend API requests and transparently refreshes
 * the session once when a protected endpoint returns 401.
 *
 * <p>Refresh-token rotation is handled by {@link AuthService#refreshSession}.
 * The presented refresh token is exchanged for a fresh access/refresh pair, then
 * the original request is retried with the new access token. If refresh fails,
 * auth state is cleared and the original 401 continues to the global error
 * interceptor, which redirects to login.</p>
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const requestWithToken =
    isBackendApiRequest(req.url) &&
    !isPublicAuthRequest(req.url) &&
    token &&
    !req.headers.has('Authorization')
      ? withBearerToken(req, token)
      : req;

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !canAttemptRefresh(req, error)) {
        return throwError(() => error);
      }

      if (!authService.getRefreshToken()) {
        authService.clearAuth();
        return throwError(() => error);
      }

      return getOrStartRefresh(authService).pipe(
        switchMap(() => {
          const refreshedToken = authService.getAccessToken();
          if (!refreshedToken) {
            return throwError(() => error);
          }
          return next(withBearerToken(req, refreshedToken));
        }),
        catchError(() => {
          authService.clearAuth();
          return throwError(() => error);
        }),
      );
    }),
  );
};
