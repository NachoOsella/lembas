import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthResponse, AuthService, RegisterRequest } from './auth';

describe('Auth service', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const apiUrl = '/api/auth';
  const user = {
    id: 1,
    email: 'frodo@lembas.com',
    firstName: 'Frodo',
    lastName: 'Baggins',
    role: 'CUSTOMER' as const,
    branchId: null,
    branchName: null,
  };
  const successResponse: AuthResponse = { user };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('Should_returnAuthResponseAndStoreUser_when_registerSucceeds', () => {
    const request: RegisterRequest = {
      firstName: 'Frodo',
      lastName: 'Baggins',
      email: 'frodo@lembas.com',
      password: 'Str0ng!Pass',
      phone: null,
    };

    service.register(request).subscribe((response) => {
      expect(response.user.email).toBe('frodo@lembas.com');
      expect(service.currentUser()).toEqual(user);
      expect(service.isAuthenticated()).toBe(true);
    });

    const req = httpMock.expectOne(`${apiUrl}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(successResponse);
  });

  it('Should_storeUser_when_loginSucceeds', () => {
    service.login({ email: 'frodo@lembas.com', password: 'Str0ng!Pass' }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(successResponse);

    expect(service.getUserRole()).toBe('CUSTOMER');
    expect(service.isAuthenticatedSync()).toBe(true);
  });

  it('Should_refreshUsingCookieBody_when_refreshSessionIsCalled', () => {
    service.refreshSession().subscribe((response) => {
      expect(response.user.id).toBe(1);
    });

    const req = httpMock.expectOne(`${apiUrl}/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(successResponse);

    expect(service.currentUser()).toEqual(user);
  });

  it('Should_hydrateUserFromMeEndpoint_when_ensureSessionSucceeds', () => {
    service.ensureSession().subscribe((authenticated) => {
      expect(authenticated).toBe(true);
      expect(service.currentUser()).toEqual(user);
    });

    const req = httpMock.expectOne(`${apiUrl}/me`);
    expect(req.request.method).toBe('GET');
    req.flush(successResponse);
  });

  it('Should_cacheFailedHydration_when_ensureSessionFails', () => {
    service.ensureSession().subscribe((authenticated) => {
      expect(authenticated).toBe(false);
      expect(service.currentUser()).toBeNull();
    });

    const req = httpMock.expectOne(`${apiUrl}/me`);
    req.flush({ code: 'UNAUTHORIZED' }, { status: 401, statusText: 'Unauthorized' });

    service.ensureSession().subscribe((authenticated) => expect(authenticated).toBe(false));
    httpMock.expectNone(`${apiUrl}/me`);
  });

  it('Should_clearAuthAndRequestCookieClear_when_logoutCalled', () => {
    service.saveAuthResponse(successResponse);
    service.logout().subscribe();

    const req = httpMock.expectOne(`${apiUrl}/logout`);
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('Should_notExposeTokensToJavaScript', () => {
    service.saveAuthResponse({ token: 'access', refreshToken: 'refresh', user });

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });
});
