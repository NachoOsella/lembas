import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthResponse, AuthService, RegisterRequest } from './auth';

/** Stubs localStorage with an in-memory store and returns the backing object. */
function stubLocalStorage(): Record<string, string> {
  const store: Record<string, string> = {};

  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string): void => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string): void => {
      delete store[key];
    }),
    clear: vi.fn((): void => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  });

  return store;
}

/**
 * Builds a fake JWT with a base64url-encoded payload containing the given claims.
 *
 * <p>The header is a static base64url of {@code {"alg":"HS256"}} and the
 * signature is a dummy value. Only the payload varies per test.</p>
 */
function buildFakeJwt(payloadClaims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const payload = btoa(JSON.stringify(payloadClaims));
  const signature = 'fake-signature';
  // Use base64url-safe encoding (replace +/=)
  const toBase64Url = (s: string) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${toBase64Url(header)}.${toBase64Url(payload)}.${signature}`;
}

describe('Auth service', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const apiUrl = '/api/auth';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
  });

  const validRequest: RegisterRequest = {
    firstName: 'Frodo',
    lastName: 'Baggins',
    email: 'frodo@lembas.com',
    password: 'Str0ng!Pass',
    phone: '+54 351 123 4567',
  };

  /** A valid JWT access token whose payload matches the login response user. */
  const validAccessToken = buildFakeJwt({
    sub: '1',
    email: 'frodo@lembas.com',
    role: 'CUSTOMER',
    tokenType: 'ACCESS',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  });

  const successResponse: AuthResponse = {
    token: validAccessToken,
    refreshToken: 'jwt-refresh-token',
    user: {
      id: 1,
      email: 'frodo@lembas.com',
      firstName: 'Frodo',
      lastName: 'Baggins',
      role: 'CUSTOMER',
      branchId: null,
      branchName: null,
    },
  };

  describe('register', () => {
    /** Should return tokens and user when registration succeeds. */
    it('Should_returnAuthResponse_when_registerWithValidData', () => {
      service.register(validRequest).subscribe({
        next: (response) => {
          expect(response.token).toBe(validAccessToken);
          expect(response.user.email).toBe('frodo@lembas.com');
          expect(response.user.role).toBe('CUSTOMER');
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(validRequest);
      req.flush(successResponse);
    });

    /** Should accept null phone and still send the request correctly. */
    it('Should_sendRegisterRequest_when_phoneIsNull', () => {
      const requestWithoutPhone: RegisterRequest = {
        firstName: 'Samwise',
        lastName: 'Gamgee',
        email: 'sam@lembas.com',
        password: 'Str0ng!Pass',
        phone: null,
      };

      service.register(requestWithoutPhone).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.body).toEqual(requestWithoutPhone);
      expect(req.request.body.phone).toBeNull();
      req.flush({
        ...successResponse,
        user: {
          ...successResponse.user,
          email: 'sam@lembas.com',
          firstName: 'Samwise',
          lastName: 'Gamgee',
        },
      });
    });

    /** Should throw conflict error when email already exists. */
    it('Should_throwError_when_registerWithDuplicatedEmail', () => {
      const errorResponse = {
        status: 409,
        statusText: 'Conflict',
        error: {
          status: 409,
          code: 'EMAIL_DUPLICATED',
          message: 'An account with this email address already exists',
          timestamp: new Date().toISOString(),
          path: '/api/auth/register',
        },
      };

      service.register(validRequest).subscribe({
        next: () => {
          throw new Error('Expected error, got success');
        },
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.code).toBe('EMAIL_DUPLICATED');
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush(errorResponse.error, { status: 409, statusText: 'Conflict' });
    });

    /** Should throw validation error when the request payload is invalid. */
    it('Should_throwValidationError_when_registerWithInvalidData', () => {
      const invalidRequest: RegisterRequest = {
        firstName: '',
        lastName: '',
        email: 'not-an-email',
        password: 'short',
        phone: null,
      };

      const errorResponse = {
        status: 400,
        statusText: 'Bad Request',
        error: {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: new Date().toISOString(),
          path: '/api/auth/register',
          details: {
            fieldErrors: [
              { field: 'firstName', message: 'must not be blank' },
              { field: 'lastName', message: 'must not be blank' },
              { field: 'email', message: 'must be a well-formed email address' },
              { field: 'password', message: 'size must be between 8 and 128' },
            ],
          },
        },
      };

      service.register(invalidRequest).subscribe({
        next: () => {
          throw new Error('Expected error, got success');
        },
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.code).toBe('VALIDATION_ERROR');
          expect(error.error.details.fieldErrors.length).toBe(4);
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush(errorResponse.error, { status: 400, statusText: 'Bad Request' });
    });

    /** Should propagate the error when a network failure occurs. */
    it('Should_throwError_when_registerWithNetworkFailure', () => {
      service.register(validRequest).subscribe({
        next: () => {
          throw new Error('Expected error, got success');
        },
        error: (error) => {
          expect(error.status).toBe(0);
          expect(error.error).toBeInstanceOf(ProgressEvent);
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.error(new ProgressEvent('network error'));
    });
  });

  describe('logout', () => {
    let store: Record<string, string>;

    beforeEach(() => {
      store = stubLocalStorage();
    });

    /** Should clear all auth state via logout(). */
    it('Should_clearAuthState_when_logoutCalled', () => {
      service.saveAuthResponse(successResponse);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getAccessToken()).not.toBeNull();
      expect(service.getUserRole()).toBe('CUSTOMER');

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(service.getAccessToken()).toBeNull();
      expect(service.getUserRole()).toBeNull();
      expect(store['lembas_access_token']).toBeUndefined();
      expect(store['lembas_refresh_token']).toBeUndefined();
    });
  });

  describe('getUserRole', () => {
    let store: Record<string, string>;

    beforeEach(() => {
      store = stubLocalStorage();
    });

    /** Should return the role of the authenticated user. */
    it('Should_returnRole_when_userIsAuthenticated', () => {
      service.saveAuthResponse(successResponse);

      expect(service.getUserRole()).toBe('CUSTOMER');
    });

    /** Should return null when no user is authenticated. */
    it('Should_returnNull_when_noUser', () => {
      expect(service.getUserRole()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    let store: Record<string, string>;

    beforeEach(() => {
      store = stubLocalStorage();
    });

    /** Should return true after saveAuthResponse. */
    it('Should_returnTrue_when_userAndTokenPresent', () => {
      service.saveAuthResponse(successResponse);

      expect(service.isAuthenticated()).toBe(true);
    });

    /** Should return false when no user is logged in. */
    it('Should_returnFalse_when_noAuth', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    /** Should return false after logout. */
    it('Should_returnFalse_afterLogout', () => {
      service.saveAuthResponse(successResponse);
      service.logout();

      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshToken persistence', () => {
    let store: Record<string, string>;

    beforeEach(() => {
      store = stubLocalStorage();
    });

    /** Should persist refresh token alongside access token. */
    it('Should_persistRefreshToken_when_saveAuthResponseWithRefreshToken', () => {
      service.saveAuthResponse(successResponse);

      expect(store['lembas_refresh_token']).toBe('jwt-refresh-token');
    });

    /** Should not persist refresh token when not provided in response. */
    it('Should_notPersistRefreshToken_when_refreshTokenNotProvided', () => {
      const responseWithoutRefresh: AuthResponse = {
        token: validAccessToken,
        refreshToken: null,
        user: successResponse.user,
      };

      service.saveAuthResponse(responseWithoutRefresh);

      expect(store['lembas_refresh_token']).toBeUndefined();
    });

    /** Should clear refresh token on clearAuth / logout. */
    it('Should_clearRefreshToken_onClearAuth', () => {
      service.saveAuthResponse(successResponse);
      service.clearAuth();

      expect(store['lembas_refresh_token']).toBeUndefined();
    });
  });

  describe('token persistence', () => {
    /** In-memory store to simulate localStorage. */
    let store: Record<string, string>;

    beforeEach(() => {
      store = stubLocalStorage();
    });

    /** Should store only the access token in localStorage (no separate user object). */
    it('Should_persistTokenOnly_when_saveAuthResponse', () => {
      service.saveAuthResponse(successResponse);

      expect(store['lembas_access_token']).toBe(validAccessToken);
      // The user object is NOT persisted separately
      expect(store['lembas_user']).toBeUndefined();
    });

    /** Should return the stored token via getAccessToken. */
    it('Should_returnToken_when_tokenIsStored', () => {
      service.saveAuthResponse(successResponse);

      expect(service.getAccessToken()).toBe(validAccessToken);
    });

    /** Should return null from getAccessToken when no token is stored. */
    it('Should_returnNull_when_noToken', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    /** Should set isAuthenticated to true after saveAuthResponse. */
    it('Should_markAuthenticated_afterSaveAuthResponse', () => {
      service.saveAuthResponse(successResponse);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.email).toBe('frodo@lembas.com');
    });

    /** Should remove token and refresh token from localStorage when clearAuth is called. */
    it('Should_removePersistedAuth_onClearAuth', () => {
      service.saveAuthResponse(successResponse);
      service.clearAuth();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(store['lembas_access_token']).toBeUndefined();
      expect(store['lembas_refresh_token']).toBeUndefined();
    });
  });

  describe('hydration (JWT payload decoding)', () => {
    /** In-memory store to simulate localStorage. */
    let store: Record<string, string>;

    /** Creates a fresh AuthService after stubbing localStorage. */
    function createHydratedService(): AuthService {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      return TestBed.inject(AuthService);
    }

    beforeEach(() => {
      store = stubLocalStorage();
    });

    /** Should hydrate basic user data when a valid access token is stored. */
    it('Should_hydrateBasicUser_when_validAccessTokenExists', () => {
      store['lembas_access_token'] = validAccessToken;

      const hydratedService = createHydratedService();

      expect(hydratedService.isAuthenticated()).toBe(true);
      expect(hydratedService.getAccessToken()).toBe(validAccessToken);
      expect(hydratedService.currentUser()).toBeTruthy();
      expect(hydratedService.currentUser()!.id).toBe(1);
      expect(hydratedService.currentUser()!.email).toBe('frodo@lembas.com');
      expect(hydratedService.currentUser()!.role).toBe('CUSTOMER');
      expect(hydratedService.getUserRole()).toBe('CUSTOMER');
      // firstName/lastName are null because the JWT doesn't carry them
      expect(hydratedService.currentUser()!.firstName).toBeNull();
      expect(hydratedService.currentUser()!.lastName).toBeNull();
      expect(hydratedService.currentUser()!.branchId).toBeNull();
      expect(hydratedService.currentUser()!.branchName).toBeNull();
    });

    /** Should hydrate refresh token when stored alongside access token. */
    it('Should_hydrateRefreshToken_when_presentInStorage', () => {
      store['lembas_access_token'] = validAccessToken;
      store['lembas_refresh_token'] = 'jwt-refresh-token';

      const hydratedService = createHydratedService();

      expect(hydratedService.isAuthenticated()).toBe(true);
      expect(hydratedService.getAccessToken()).toBe(validAccessToken);
    });

    /** Should not hydrate when the stored token is not a valid JWT. */
    it('Should_notHydrate_when_tokenIsNotJwt', () => {
      store['lembas_access_token'] = 'not-a-valid-jwt-at-all';

      const hydratedService = createHydratedService();

      expect(hydratedService.isAuthenticated()).toBe(false);
      expect(hydratedService.currentUser()).toBeNull();
      expect(hydratedService.getAccessToken()).toBeNull();
      expect(store['lembas_access_token']).toBeUndefined();
    });

    /** Should not hydrate when the JWT payload has missing required claims. */
    it('Should_notHydrate_when_jwtPayloadIsMissingClaims', () => {
      const missingEmailToken = buildFakeJwt({
        sub: '1',
        role: 'CUSTOMER',
        tokenType: 'ACCESS',
        iat: Date.now(),
        exp: Date.now() + 86400,
      });
      store['lembas_access_token'] = missingEmailToken;

      const hydratedService = createHydratedService();

      expect(hydratedService.isAuthenticated()).toBe(false);
      expect(hydratedService.currentUser()).toBeNull();
      expect(store['lembas_access_token']).toBeUndefined();
    });

    /** Should not hydrate when the token is a refresh token, not an access token. */
    it('Should_notHydrate_when_tokenTypeIsNotAccess', () => {
      const refreshJwt = buildFakeJwt({
        sub: '1',
        tokenType: 'REFRESH',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
      });
      store['lembas_access_token'] = refreshJwt;

      const hydratedService = createHydratedService();

      expect(hydratedService.isAuthenticated()).toBe(false);
      expect(hydratedService.currentUser()).toBeNull();
      expect(store['lembas_access_token']).toBeUndefined();
    });

    /** Should not hydrate when the role in the token is invalid. */
    it('Should_notHydrate_when_roleIsInvalid', () => {
      const badRoleToken = buildFakeJwt({
        sub: '2',
        email: 'bad@role.com',
        role: 'SUPER_ADMIN',
        tokenType: 'ACCESS',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      });
      store['lembas_access_token'] = badRoleToken;

      const hydratedService = createHydratedService();

      expect(hydratedService.isAuthenticated()).toBe(false);
      expect(hydratedService.currentUser()).toBeNull();
    });

    /** Should not hydrate when the subject is not a valid number. */
    it('Should_notHydrate_when_subIsNotNumeric', () => {
      const badSubToken = buildFakeJwt({
        sub: 'abc-not-a-number',
        email: 'user@lembas.com',
        role: 'CUSTOMER',
        tokenType: 'ACCESS',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      });
      store['lembas_access_token'] = badSubToken;

      const hydratedService = createHydratedService();

      expect(hydratedService.isAuthenticated()).toBe(false);
      expect(hydratedService.currentUser()).toBeNull();
    });

    /** Should not hydrate when no token exists in localStorage. */
    it('Should_notHydrate_when_noTokenInStorage', () => {
      const hydratedService = createHydratedService();

      expect(hydratedService.isAuthenticated()).toBe(false);
      expect(hydratedService.currentUser()).toBeNull();
    });
  });
});
