import { TestBed } from '@angular/core/testing';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { of } from 'rxjs';

import { authInterceptor } from './auth-interceptor';
import { AuthService } from '../services/auth';

describe('AuthInterceptor', () => {
  let mockAuthService: { getAccessToken: ReturnType<typeof vi.fn> };

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

  /** Should not attach token to external/non-API URLs even when a token exists. */
  it('Should_notAttachHeader_onExternalUrl', () => {
    const token = 'should-not-be-sent';
    mockAuthService.getAccessToken.mockReturnValue(token);

    run(new HttpRequest<null>('GET', 'https://third-party.com/analytics'));

    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest!.headers.has('Authorization')).toBe(false);
  });
});
