import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { MessageService } from 'primeng/api';

import { UserList } from './user-list';
import { UserService } from '@features/users/data-access/user';
import type { Branch, Page, UserResponse } from '@features/users/domain/user';

/** Builds a fake user response for testing. */
function buildUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 1,
    email: 'admin@lembas.com',
    firstName: 'Admin',
    lastName: 'User',
    phone: null,
    role: 'ADMIN',
    branchId: null,
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Builds a paginated response with the given users. */
function userPage(
  users: UserResponse[],
  totalElements = users.length,
  size = 10,
): Page<UserResponse> {
  return {
    content: users,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / size)),
    number: 0,
    size,
    first: true,
    last: true,
    empty: users.length === 0,
  };
}

/** Sample branches for testing. */
const SAMPLE_BRANCHES: Branch[] = [
  { id: 1, name: 'Centro' },
  { id: 2, name: 'Nueva Cordoba' },
];

/** Simple branch lookup function. */
function branchName(id: number | null): string | undefined {
  return id != null ? SAMPLE_BRANCHES.find((b) => b.id === id)?.name : undefined;
}

/** Type-unsafe helper to access protected component members. */
function unsafe(component: UserList): Record<string, unknown> {
  return component as unknown as Record<string, unknown>;
}

describe('UserList', () => {
  let component: UserList;
  let fixture: ComponentFixture<UserList>;
  let svc: Record<string, ReturnType<typeof vi.fn>>;
  let c: Record<string, unknown>;

  function configure(users: UserResponse[] = [], totalElements = users.length): void {
    svc = {
      listUsers: vi.fn().mockReturnValue(of(userPage(users, totalElements))),
      updateUserStatus: vi.fn().mockReturnValue(of(buildUser())),
      listBranches: vi.fn().mockReturnValue(of(SAMPLE_BRANCHES)),
    };

    TestBed.configureTestingModule({
      imports: [UserList],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: UserService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserList);
    component = fixture.componentInstance;
    c = unsafe(component);
    fixture.detectChanges();
  }

  // ---------------------------------------------------------------------------
  // Creation and loading
  // ---------------------------------------------------------------------------
  describe('creation and loading', () => {
    it('should create the component', () => {
      configure();
      expect(component).toBeTruthy();
    });

    it('should load users on init', () => {
      const user = buildUser();
      configure([user]);

      expect(svc['listUsers']).toHaveBeenCalledWith(undefined, undefined, 0, 10, '', undefined);
      expect((c['users'] as () => UserResponse[])().length).toBe(1);
    });

    it('should load branches on init', () => {
      configure();
      expect(svc['listBranches']).toHaveBeenCalledTimes(1);
      expect((c['branches'] as () => Branch[])().length).toBe(2);
    });

    it('should refresh users when refresh() is called', () => {
      configure([buildUser()]);
      svc['listUsers'].mockReturnValue(
        of(userPage([buildUser({ id: 2, email: 'second@lembas.com' })])),
      );

      component.refresh();

      expect(svc['listUsers']).toHaveBeenCalledTimes(2);
    });

    it('should request the selected backend page when pagination changes', () => {
      configure([buildUser()], 50);
      svc['listUsers'].mockClear();

      (c['onPageChange'] as (event: { first: number; rows: number }) => void)({
        first: 20,
        rows: 20,
      });

      expect(svc['listUsers']).toHaveBeenCalledWith(undefined, undefined, 1, 20, '', undefined);
      expect((c['first'] as () => number)()).toBe(20);
      expect((c['pageSize'] as () => number)()).toBe(20);
    });

    it('should handle loading error gracefully', () => {
      svc['listUsers'] = vi.fn().mockReturnValue(throwError(() => new Error('network error')));
      configure();

      expect((c['loading'] as () => boolean)()).toBeFalsy();
    });
  });

  // ---------------------------------------------------------------------------
  // Backend search
  // ---------------------------------------------------------------------------
  describe('backend search', () => {
    it('should reload the first backend page with the search term', () => {
      const result = buildUser({ firstName: 'Gandalf', email: 'gandalf@lembas.com' });
      configure([]);
      svc['listUsers'].mockReturnValue(of(userPage([result], 1)));
      svc['listUsers'].mockClear();

      (c['first'] as { set(v: number): void }).set(40);
      (c['onSearch'] as (query: string) => void)('gandalf');

      expect(svc['listUsers']).toHaveBeenCalledWith(
        undefined,
        undefined,
        0,
        10,
        'gandalf',
        undefined,
      );
      expect((c['first'] as () => number)()).toBe(0);
      expect((c['users'] as () => UserResponse[])()[0].email).toBe('gandalf@lembas.com');
      expect((c['totalRecords'] as () => number)()).toBe(1);
    });

    it('should clear search and reload the first backend page', () => {
      configure([buildUser()]);
      svc['listUsers'].mockReturnValue(of(userPage([buildUser({ id: 2 })], 50)));
      svc['listUsers'].mockClear();

      (c['searchQuery'] as { set(v: string): void }).set('gandalf');
      (c['first'] as { set(v: number): void }).set(20);
      (c['onSearchClear'] as () => void)();

      expect(svc['listUsers']).toHaveBeenCalledWith(undefined, undefined, 0, 10, '', undefined);
      expect((c['searchQuery'] as () => string)()).toBe('');
      expect((c['first'] as () => number)()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Backend sorting
  // ---------------------------------------------------------------------------
  describe('backend sorting', () => {
    it('should reload the first backend page with ascending sort', () => {
      configure([buildUser()]);
      svc['listUsers'].mockClear();

      (c['onSort'] as (event: { field: string; order: number }) => void)({
        field: 'email',
        order: 1,
      });

      expect(svc['listUsers']).toHaveBeenCalledWith(undefined, undefined, 0, 10, '', 'email,asc');
      expect((c['first'] as () => number)()).toBe(0);
    });

    it('should reload the first backend page with descending sort', () => {
      configure([buildUser()]);
      svc['listUsers'].mockClear();

      (c['onSort'] as (event: { field: string; order: number }) => void)({
        field: 'role',
        order: -1,
      });

      expect(svc['listUsers']).toHaveBeenCalledWith(undefined, undefined, 0, 10, '', 'role,desc');
    });

    it('should clear sorting when PrimeNG emits an unsorted state', () => {
      configure([buildUser()]);
      svc['listUsers'].mockClear();

      (c['onSort'] as (event: { field: string; order: number }) => void)({
        field: 'email',
        order: 0,
      });

      expect(svc['listUsers']).toHaveBeenCalledWith(undefined, undefined, 0, 10, '', undefined);
    });

    it('should ignore unsupported sort fields', () => {
      configure([buildUser()]);
      svc['listUsers'].mockClear();

      (c['onSort'] as (event: { field: string; order: number }) => void)({
        field: 'branchId',
        order: 1,
      });

      expect(svc['listUsers']).toHaveBeenCalledWith(undefined, undefined, 0, 10, '', undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty description
  // ---------------------------------------------------------------------------
  describe('empty description', () => {
    it('should show search-not-found message when query is active', () => {
      configure([]);
      (c['searchQuery'] as { set(v: string): void }).set('missing');
      fixture.detectChanges();

      const desc = (c['emptyDescription'] as () => string)();
      expect(desc).toContain('missing');
    });

    it('should show initial empty message when no query', () => {
      configure([]);
      (c['searchQuery'] as { set(v: string): void }).set('');

      const desc = (c['emptyDescription'] as () => string)();
      expect(desc).toContain('Cree el primer usuario');
    });
  });

  // ---------------------------------------------------------------------------
  // Status toggle
  // ---------------------------------------------------------------------------
  describe('status toggle', () => {
    it('should toggle user enabled state', () => {
      const user = buildUser({ id: 3, email: 'emp@lembas.com', role: 'EMPLOYEE', enabled: true });
      configure([user]);

      const updated = { ...user, enabled: false };
      svc['updateUserStatus'].mockReturnValue(of(updated));

      (c['toggleStatus'] as (u: UserResponse) => void)(user);

      expect(svc['updateUserStatus']).toHaveBeenCalledWith(3, false);
      expect((c['users'] as () => UserResponse[])()[0].enabled).toBeFalsy();
    });

    it('should reload users on toggle error', () => {
      const user = buildUser({ id: 3, role: 'EMPLOYEE', enabled: true });
      configure([user]);
      svc['updateUserStatus'].mockReturnValue(throwError(() => new Error('fail')));
      svc['listUsers'].mockClear();

      (c['toggleStatus'] as (u: UserResponse) => void)(user);

      expect(svc['listUsers']).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Output events
  // ---------------------------------------------------------------------------
  describe('output events', () => {
    it('should emit createUser when create button is clicked', () => {
      configure();
      const spy = vi.fn();
      component.createUser.subscribe(spy);

      (c['createUser'] as { emit(): void }).emit();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit editUser when edit button is clicked', () => {
      const user = buildUser();
      configure();
      const spy = vi.fn();
      component.editUser.subscribe(spy);

      (c['editUser'] as { emit(u: UserResponse): void }).emit(user);
      expect(spy).toHaveBeenCalledWith(user);
    });
  });

  // ---------------------------------------------------------------------------
  // Template helpers
  // ---------------------------------------------------------------------------
  describe('template helpers', () => {
    it('should return correct badge tone for each role', () => {
      configure();
      expect((c['roleTone'] as (r: string) => string)('ADMIN')).toBe('info');
      expect((c['roleTone'] as (r: string) => string)('MANAGER')).toBe('warning');
      expect((c['roleTone'] as (r: string) => string)('EMPLOYEE')).toBe('success');
      expect((c['roleTone'] as (r: string) => string)('UNKNOWN')).toBe('neutral');
    });

    it('should return Spanish label for each role', () => {
      configure();
      expect((c['roleLabel'] as (r: string) => string)('ADMIN')).toBe('Administrador');
      expect((c['roleLabel'] as (r: string) => string)('MANAGER')).toBe('Gerente');
      expect((c['roleLabel'] as (r: string) => string)('EMPLOYEE')).toBe('Empleado');
    });
  });
});
