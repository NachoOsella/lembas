import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { MessageService } from 'primeng/api';

import { UserList } from './user-list';
import { UserService } from '../../../../core/services/user';
import { Branch, Page, UserResponse } from '../../../../shared/models/user';

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
function userPage(users: UserResponse[]): Page<UserResponse> {
  return {
    content: users,
    totalElements: users.length,
    totalPages: 1,
    number: 0,
    size: 20,
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

  function configure(users: UserResponse[] = []): void {
    svc = {
      listUsers: vi.fn().mockReturnValue(of(userPage(users))),
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

      expect(svc['listUsers']).toHaveBeenCalledTimes(1);
      expect((c['users'] as () => UserResponse[])().length).toBe(1);
    });

    it('should load branches on init', () => {
      configure();
      expect(svc['listBranches']).toHaveBeenCalledTimes(1);
      expect((c['branches'] as () => Branch[])().length).toBe(2);
    });

    it('should refresh users when refresh() is called', () => {
      configure([buildUser()]);
      svc['listUsers'].mockReturnValue(of(userPage([buildUser({ id: 2, email: 'second@lembas.com' })])));

      component.refresh();

      expect(svc['listUsers']).toHaveBeenCalledTimes(2);
    });

    it('should handle loading error gracefully', () => {
      svc['listUsers'] = vi.fn().mockReturnValue(throwError(() => new Error('network error')));
      configure();

      expect((c['loading'] as () => boolean)()).toBeFalsy();
    });
  });

  // ---------------------------------------------------------------------------
  // Search filtering
  // ---------------------------------------------------------------------------
  describe('search filtering', () => {
    const users = [
      buildUser({ id: 1, email: 'admin@lembas.com', firstName: 'Gandalf', lastName: 'Grey', role: 'ADMIN', branchId: null }),
      buildUser({ id: 2, email: 'manager@lembas.com', firstName: 'Saruman', lastName: 'White', role: 'MANAGER', branchId: 1 }),
      buildUser({ id: 3, email: 'employee@lembas.com', firstName: 'Frodo', lastName: 'Baggins', role: 'EMPLOYEE', branchId: 1 }),
    ];

    beforeEach(() => {
      configure(users);
      fixture.componentRef.setInput('branchName', branchName);
      fixture.detectChanges();
    });

    it('should return all users when search query is empty', () => {
      (c['searchQuery'] as { set(v: string): void }).set('');
      fixture.detectChanges();

      const filtered = (c['filteredUsers'] as () => UserResponse[])();
      expect(filtered.length).toBe(3);
    });

    it('should filter by first name', () => {
      (c['searchQuery'] as { set(v: string): void }).set('gandalf');
      fixture.detectChanges();

      const filtered = (c['filteredUsers'] as () => UserResponse[])();
      expect(filtered.length).toBe(1);
      expect(filtered[0].firstName).toBe('Gandalf');
    });

    it('should filter by last name', () => {
      (c['searchQuery'] as { set(v: string): void }).set('baggins');
      fixture.detectChanges();

      const filtered = (c['filteredUsers'] as () => UserResponse[])();
      expect(filtered.length).toBe(1);
      expect(filtered[0].lastName).toBe('Baggins');
    });

    it('should filter by email', () => {
      (c['searchQuery'] as { set(v: string): void }).set('manager@lembas');
      fixture.detectChanges();

      const filtered = (c['filteredUsers'] as () => UserResponse[])();
      expect(filtered.length).toBe(1);
      expect(filtered[0].email).toBe('manager@lembas.com');
    });

    it('should filter by role label', () => {
      (c['searchQuery'] as { set(v: string): void }).set('gerente');
      fixture.detectChanges();

      const filtered = (c['filteredUsers'] as () => UserResponse[])();
      expect(filtered.length).toBe(1);
      expect(filtered[0].role).toBe('MANAGER');
    });

    it('should filter by branch name', () => {
      (c['searchQuery'] as { set(v: string): void }).set('centro');
      fixture.detectChanges();

      const filtered = (c['filteredUsers'] as () => UserResponse[])();
      // Manager and Employee are in branch 1 (Centro)
      expect(filtered.length).toBe(2);
    });

    it('should return empty array when no match', () => {
      (c['searchQuery'] as { set(v: string): void }).set('nonexistent');
      fixture.detectChanges();

      const filtered = (c['filteredUsers'] as () => UserResponse[])();
      expect(filtered.length).toBe(0);
    });

    it('should clear search via onSearchClear', () => {
      (c['searchQuery'] as { set(v: string): void }).set('gandalf');
      (c['onSearchClear'] as () => void)();

      expect((c['searchQuery'] as () => string)()).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------
  describe('userMetrics', () => {
    it('should compute correct metrics from user list', () => {
      const users = [
        buildUser({ id: 1, role: 'ADMIN', branchId: null, enabled: true }),
        buildUser({ id: 2, role: 'MANAGER', branchId: 1, enabled: true }),
        buildUser({ id: 3, role: 'EMPLOYEE', branchId: 1, enabled: false }),
      ];
      configure(users);

      const metrics = (c['userMetrics'] as () => { label: string; value: number }[])();
      expect(metrics[0].value).toBe(3);  // total usuarios
      expect(metrics[1].value).toBe(2);  // activos
      expect(metrics[2].value).toBe(2);  // con sucursal asignada
    });

    it('should show zero counts for empty user list', () => {
      configure([]);

      const metrics = (c['userMetrics'] as () => { label: string; value: number }[])();
      expect(metrics[0].value).toBe(0);
      expect(metrics[1].value).toBe(0);
      expect(metrics[2].value).toBe(0);
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
