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

/** Returns true for auth endpoints that must not trigger a refresh retry. */
function isPublicAuthRequest(url: string): boolean {
  return url === '/api/auth/login' || url === '/api/auth/register' || url === '/api/auth/refresh' || url === '/api/auth/logout';
}

/** Returns true when a failed response can be retried after refresh-cookie rotation. */
function canAttemptRefresh(req: HttpRequest<unknown>, error: HttpErrorResponse): boolean {
  return error.status === 401 && isBackendApiRequest(req.url) && !isPublicAuthRequest(req.url);
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
 * Retries protected API requests once after a 401 by rotating HttpOnly cookies.
 *
 * <p>No Authorization header is attached here because access and refresh tokens
 * are intentionally inaccessible to JavaScript. The browser sends the scoped
 * cookies automatically to same-origin API endpoints.</p>
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || !canAttemptRefresh(req, error)) {
        return throwError(() => error);
      }

      return getOrStartRefresh(authService).pipe(
        switchMap(() => next(req)),
        catchError(() => {
          authService.clearAuth();
          return throwError(() => error);
        }),
      );
    }),
  );
};
