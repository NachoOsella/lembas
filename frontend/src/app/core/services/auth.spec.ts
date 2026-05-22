import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthResponse, AuthService, RegisterRequest } from './auth';

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
  });

  const validRequest: RegisterRequest = {
    firstName: 'Frodo',
    lastName: 'Baggins',
    email: 'frodo@lembas.com',
    password: 'Str0ng!Pass',
    phone: '+54 351 123 4567',
  };

  const successResponse: AuthResponse = {
    token: 'jwt-access-token',
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
          expect(response.token).toBe('jwt-access-token');
          expect(response.refreshToken).toBe('jwt-refresh-token');
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
        user: { ...successResponse.user, email: 'sam@lembas.com', firstName: 'Samwise', lastName: 'Gamgee' },
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
        next: () => { throw new Error('Expected error, got success'); },
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
        next: () => { throw new Error('Expected error, got success'); },
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
        next: () => { throw new Error('Expected error, got success'); },
        error: (error) => {
          expect(error.status).toBe(0);
          expect(error.error).toBeInstanceOf(ProgressEvent);
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.error(new ProgressEvent('network error'));
    });
  });
});
