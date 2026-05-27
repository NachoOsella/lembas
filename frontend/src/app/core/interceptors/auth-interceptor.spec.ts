import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { authInterceptor } from './auth-interceptor';
import { AuthService } from '../services/auth';

describe('AuthInterceptor', () => {
  let mockAuthService: {
    getAccessToken: ReturnType<typeof vi.fn>;
    getRefreshToken: ReturnType<typeof vi.fn>;
    refreshSession: ReturnType<typeof vi.fn>;
    clearAuth: ReturnType<typeof vi.fn>;
  };

  /** Returns the request that was passed to the mock handler, or null. */
  let capturedRequest: HttpRequest<unknown> | null = null;

  /** Fake handler that captures the request and returns an HttpResponse. */
  function makeHandler(): HttpHandlerFn {
    return (req: HttpRequest<unknown>) => {
      capturedRequest = req;
      return of(new HttpResponse<unknown>());
    };
  }

  function run(req: HttpRequest<unknown>): void {
    const interceptor: HttpInterceptorFn = (r, next) =>
      TestBed.runInInjectionContext(() => authInterceptor(r, next));
    interceptor(req, makeHandler()).subscribe();
  }

  beforeEach(() => {
    mockAuthService = {
      getAccessToken: vi.fn(),
      getRefreshToken: vi.fn(),
      refreshSession: vi.fn(),
      clearAuth: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    });

    capturedRequest = null;
  });

  /** Should attach Authorization: Bearer header when a token is available. */
  it('Should_attachBearerHeader_when_tokenExists', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc';
    mockAuthService.getAccessToken.mockReturnValue(token);

    run(new HttpRequest<null>('GET', '/api/auth/me'));

    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest!.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  /** Should not attach Authorization header when no token is available. */
  it('Should_notAttachHeader_when_tokenIsNull', () => {
    mockAuthService.getAccessToken.mockReturnValue(null);

    run(new HttpRequest<null>('GET', '/api/auth/me'));

    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest!.headers.has('Authorization')).toBe(false);
  });

  /** Should preserve an existing Authorization header and not overwrite it. */
  it('Should_preserveExistingAuthorizationHeader', () => {
    const existingToken = 'existing-custom-token';
    mockAuthService.getAccessToken.mockReturnValue('should-not-be-used');

    run(
      new HttpRequest<null>('GET', '/api/store/products', null, {
        headers: new HttpHeaders({ Authorization: `Bearer ${existingToken}` }),
      }),
    );

    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest!.headers.get('Authorization')).toBe(`Bearer ${existingToken}`);
  });

  /** Should pass public store request through unchanged when no token exists. */
  it('Should_passPublicRequestThrough_when_noToken', () => {
    mockAuthService.getAccessToken.mockReturnValue(null);

    run(new HttpRequest<null>('GET', '/api/store/products'));

    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest!.headers.has('Authorization')).toBe(false);
  });

  /** Should not attach stale tokens to public login/register endpoints. */
  it('Should_notAttachHeader_onPublicAuthRequests', () => {
    mockAuthService.getAccessToken.mockReturnValue('stale-token');

    run(new HttpRequest<unknown>('POST', '/api/auth/login', { email: 'admin@lembas.com' }));

    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest!.headers.has('Authorization')).toBe(false);
  });

  /** Should attach token to POST requests (not just GET). */
  it('Should_attachBearerHeader_onPostRequest', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.def';
    mockAuthService.getAccessToken.mockReturnValue(token);

    run(new HttpRequest<unknown>('POST', '/api/customer/orders', { productId: 1 }));

    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest!.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  /** Should refresh the session and retry the original request after a protected 401. */
  it('Should_refreshAndRetryRequest_when_protectedApiReturns401', async () => {
    const oldToken = 'old-access-token';
    const newToken = 'new-access-token';
    mockAuthService.getAccessToken.mockReturnValueOnce(oldToken).mockReturnValueOnce(newToken);
    mockAuthService.getRefreshToken.mockReturnValue('refresh-token');
    mockAuthService.refreshSession.mockReturnValue(
      of({
        token: newToken,
        refreshToken: 'new-refresh-token',
        user: {
          id: 1,
          email: 'frodo@lembas.com',
          firstName: 'Frodo',
          lastName: 'Baggins',
          role: 'CUSTOMER',
          branchId: null,
          branchName: null,
        },
      }),
    );

    const handledRequests: HttpRequest<unknown>[] = [];
    const handler: HttpHandlerFn = (req) => {
      handledRequests.push(req);
      if (handledRequests.length === 1) {
        return throwError(() => new HttpErrorResponse({ status: 401, url: req.url }));
      }
      return of(new HttpResponse<unknown>({ status: 200 }));
    };

    await new Promise<void>((resolve, reject) => {
      TestBed.runInInjectionContext(() =>
        authInterceptor(new HttpRequest('GET', '/api/auth/me'), handler),
      ).subscribe({ next: () => resolve(), error: reject });
    });

    expect(mockAuthService.refreshSession).toHaveBeenCalledTimes(1);
    expect(handledRequests).toHaveLength(2);
    expect(handledRequests[0].headers.get('Authorization')).toBe(`Bearer ${oldToken}`);
    expect(handledRequests[1].headers.get('Authorization')).toBe(`Bearer ${newToken}`);
  });

  /** Should clear auth and propagate the original 401 when refresh fails. */
  it('Should_clearAuth_when_refreshFails', async () => {
    mockAuthService.getAccessToken.mockReturnValue('old-access-token');
    mockAuthService.getRefreshToken.mockReturnValue('refresh-token');
    mockAuthService.refreshSession.mockReturnValue(throwError(() => new Error('refresh failed')));

    const error = new HttpErrorResponse({ status: 401, url: '/api/customer/orders' });
    const handler: HttpHandlerFn = () => throwError(() => error);

    await new Promise<void>((resolve) => {
      TestBed.runInInjectionContext(() =>
        authInterceptor(new HttpRequest('GET', '/api/customer/orders'), handler),
      ).subscribe({
        next: () => {
          throw new Error('Expected error, got success');
        },
        error: (received) => {
          expect(received).toBe(error);
          resolve();
        },
      });
    });

    expect(mockAuthService.clearAuth).toHaveBeenCalledTimes(1);
  });

  /** Should not attach token to external/non-API URLs even when a token exists. */
  it('Should_notAttachHeader_onExternalUrl', () => {
    const token = 'should-not-be-sent';
    mockAuthService.getAccessToken.mockReturnValue(token);

    run(new HttpRequest<null>('GET', 'https://third-party.com/analytics'));

    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest!.headers.has('Authorization')).toBe(false);
  });
});
