import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

/** Returns true when the request targets the backend API. */
function isBackendApiRequest(url: string): boolean {
  return url.startsWith('/api/');
}

/**
 * Attaches the JWT access token as a Bearer header to outgoing HTTP requests
 * targeting the backend API.
 *
 * <p>Only requests with a URL starting with {@code /api/} are considered for
 * token attachment. This prevents leaking the JWT to external third-party
 * URLs. Requests that already carry an {@code Authorization} header are left
 * untouched. Public requests (no token) pass through unchanged.</p>
 *
 * <p>Registered in {@code app.config.ts} via
 * {@code provideHttpClient(withInterceptors([...]))} and executes before
 * {@code errorInterceptor} in the interceptor chain (so auth headers are
 * attached before error handling).</p>
 *
 * @param req  the outgoing HTTP request
 * @param next the next handler in the interceptor chain
 * @returns the HTTP event stream
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  // Only attach tokens to requests targeting the backend API.
  if (!isBackendApiRequest(req.url)) {
    return next(req);
  }

  // Preserve requests that already carry an Authorization header.
  if (req.headers.has('Authorization')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  if (!token) {
    return next(req);
  }

  const authenticatedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedRequest);
};
