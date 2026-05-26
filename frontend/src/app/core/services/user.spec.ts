import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { UserService } from './user';
import {
  Branch,
  CreateUserRequest,
  Page,
  UpdateUserRequest,
  UserResponse,
} from '../../shared/models/user';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const usersUrl = '/api/admin/users';
  const branchesUrl = '/api/admin/branches';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------------------------------------------------------------------------
  // listUsers
  // ---------------------------------------------------------------------------
  describe('listUsers', () => {
    it('should fetch users with default pagination', () => {
      const expectedPage: Page<UserResponse> = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 20,
        first: true,
        last: true,
        empty: true,
      };

      service.listUsers().subscribe((page) => {
        expect(page).toEqual(expectedPage);
      });

      const req = httpMock.expectOne(`${usersUrl}?page=0&size=20`);
      expect(req.request.method).toBe('GET');
      req.flush(expectedPage);
    });

    it('should include optional role and branchId params', () => {
      service.listUsers('MANAGER', 2, 0, 10).subscribe();

      const req = httpMock.expectOne(`${usersUrl}?page=0&size=10&role=MANAGER&branchId=2`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [] });
    });
  });

  // ---------------------------------------------------------------------------
  // createUser
  // ---------------------------------------------------------------------------
  describe('createUser', () => {
    it('should POST a new user and return the created user', () => {
      const request: CreateUserRequest = {
        email: 'new@lembas.com',
        password: 'Str0ng!Pass',
        firstName: 'New',
        lastName: 'User',
        role: 'EMPLOYEE',
        branchId: 1,
      };

      const expected: UserResponse = {
        id: 42,
        email: 'new@lembas.com',
        firstName: 'New',
        lastName: 'User',
        phone: null,
        role: 'EMPLOYEE',
        branchId: 1,
        enabled: true,
        createdAt: '2026-05-25T00:00:00Z',
        updatedAt: '2026-05-25T00:00:00Z',
      };

      service.createUser(request).subscribe((user) => {
        expect(user).toEqual(expected);
      });

      const req = httpMock.expectOne(usersUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(expected);
    });
  });

  // ---------------------------------------------------------------------------
  // updateUser
  // ---------------------------------------------------------------------------
  describe('updateUser', () => {
    it('should PUT updated user fields', () => {
      const request: UpdateUserRequest = { firstName: 'Updated' };

      const expected: UserResponse = {
        id: 1,
        email: 'admin@lembas.com',
        firstName: 'Updated',
        lastName: 'User',
        phone: null,
        role: 'ADMIN',
        branchId: null,
        enabled: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-05-25T00:00:00Z',
      };

      service.updateUser(1, request).subscribe((user) => {
        expect(user).toEqual(expected);
      });

      const req = httpMock.expectOne(`${usersUrl}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(request);
      req.flush(expected);
    });
  });

  // ---------------------------------------------------------------------------
  // updateUserStatus
  // ---------------------------------------------------------------------------
  describe('updateUserStatus', () => {
    it('should PATCH enabled status', () => {
      const expected: UserResponse = {
        id: 1,
        email: 'admin@lembas.com',
        firstName: 'Admin',
        lastName: 'User',
        phone: null,
        role: 'ADMIN',
        branchId: null,
        enabled: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-05-25T00:00:00Z',
      };

      service.updateUserStatus(1, false).subscribe((user) => {
        expect(user).toEqual(expected);
      });

      const req = httpMock.expectOne(`${usersUrl}/1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ enabled: false });
      req.flush(expected);
    });
  });

  // ---------------------------------------------------------------------------
  // listBranches
  // ---------------------------------------------------------------------------
  describe('listBranches', () => {
    it('should fetch branches from /api/admin/branches', () => {
      const expected: Branch[] = [
        { id: 1, name: 'Centro', active: true },
        { id: 2, name: 'Nueva Cordoba', active: true },
      ];

      service.listBranches().subscribe((branches) => {
        expect(branches).toEqual(expected);
      });

      const req = httpMock.expectOne(branchesUrl);
      expect(req.request.method).toBe('GET');
      req.flush(expected);
    });
  });
});
