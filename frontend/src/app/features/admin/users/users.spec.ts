import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { MessageService } from 'primeng/api';

import { Users } from './users';
import { UserService } from '../../../core/services/user';
import { Branch, Page, UserResponse } from '../../../shared/models/user';

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

/** Type-unsafe helper to access protected component members. */
function unsafe(component: Users): Record<string, unknown> {
  return component as unknown as Record<string, unknown>;
}

describe('Users', () => {
  let component: Users;
  let fixture: ComponentFixture<Users>;
  let svc: Record<string, ReturnType<typeof vi.fn>>;
  let c: Record<string, unknown>;

  /** Configures TestBed with the Users component and a mock UserService. */
  function configureTestingModule(users: UserResponse[] = []): void {
    svc = {
      listUsers: vi.fn().mockReturnValue(of(userPage(users))),
      createUser: vi.fn().mockReturnValue(of(buildUser())),
      updateUser: vi.fn().mockReturnValue(of(buildUser())),
      updateUserStatus: vi.fn().mockReturnValue(of(buildUser())),
      listBranches: vi.fn().mockReturnValue(of(SAMPLE_BRANCHES)),
    };

    TestBed.configureTestingModule({
      imports: [Users],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: UserService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Users);
    component = fixture.componentInstance;
    c = unsafe(component);
    fixture.detectChanges();
  }

  describe('creation', () => {
    it('should create the component', () => {
      configureTestingModule();
      expect(component).toBeTruthy();
    });

    it('should load users on init', () => {
      configureTestingModule([buildUser()]);
      expect(svc['listUsers']).toHaveBeenCalledTimes(1);
      expect((c['users'] as () => UserResponse[])().length).toBe(1);
    });

    it('should load branches on init', () => {
      configureTestingModule();
      expect(svc['listBranches']).toHaveBeenCalledTimes(1);
      expect((c['branches'] as () => Branch[])().length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Email validation
  // ---------------------------------------------------------------------------
  describe('email validation', () => {
    beforeEach(() => configureTestingModule());

    it('should accept a well-formed email', () => {
      (c['formEmail'] as { set(v: string): void }).set('user@example.com');
      expect((c['formEmailValid'] as () => boolean)()).toBeTruthy();
    });

    it('should accept email with subdomain', () => {
      (c['formEmail'] as { set(v: string): void }).set('user@sub.example.co.uk');
      expect((c['formEmailValid'] as () => boolean)()).toBeTruthy();
    });

    it('should reject email without @', () => {
      (c['formEmail'] as { set(v: string): void }).set('notanemail');
      expect((c['formEmailValid'] as () => boolean)()).toBeFalsy();
    });

    it('should reject email without domain', () => {
      (c['formEmail'] as { set(v: string): void }).set('user@');
      expect((c['formEmailValid'] as () => boolean)()).toBeFalsy();
    });

    it('should reject email without TLD', () => {
      (c['formEmail'] as { set(v: string): void }).set('user@domain');
      expect((c['formEmailValid'] as () => boolean)()).toBeFalsy();
    });

    it('should reject email with spaces', () => {
      (c['formEmail'] as { set(v: string): void }).set('user @example.com');
      expect((c['formEmailValid'] as () => boolean)()).toBeFalsy();
    });

    it('should reject empty email', () => {
      (c['formEmail'] as { set(v: string): void }).set('');
      expect((c['formEmailValid'] as () => boolean)()).toBeFalsy();
    });

    it('should set formSubmitted when submit is called', () => {
      (c['formSubmitted'] as { set(v: boolean): void }).set(false);
      (c['formEmail'] as { set(v: string): void }).set('');
      (c['formFirstName'] as { set(v: string): void }).set('');
      (c['formLastName'] as { set(v: string): void }).set('');
      (c['formPassword'] as { set(v: string): void }).set('');
      (c['formRole'] as { set(v: string): void }).set('EMPLOYEE');
      (c['formBranchId'] as { set(v: number | null): void }).set(null);

      (c['submit'] as () => void)();

      expect((c['formSubmitted'] as () => boolean)()).toBeTruthy();
    });

    it('should block create submit when email is malformed and show inline feedback', () => {
      (c['openCreateDialog'] as () => void)();
      (c['formEmail'] as { set(v: string): void }).set('bad-email');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formFirstName'] as { set(v: string): void }).set('Test');
      (c['formLastName'] as { set(v: string): void }).set('User');
      (c['formRole'] as { set(v: string): void }).set('EMPLOYEE');
      (c['formBranchId'] as { set(v: number | null): void }).set(1);

      (c['submit'] as () => void)();
      fixture.detectChanges();

      expect(svc['createUser']).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Ingrese un email valido');
    });
  });

  // ---------------------------------------------------------------------------
  // Role + Branch show/hide
  // ---------------------------------------------------------------------------
  describe('role / branch interaction', () => {
    beforeEach(() => configureTestingModule());

    it('should show branch field when role is MANAGER', () => {
      (c['onRoleChange'] as (r: string) => void)('MANAGER');
      fixture.detectChanges();
      expect((c['showBranchField'] as () => boolean)()).toBeTruthy();
    });

    it('should show branch field when role is EMPLOYEE', () => {
      (c['onRoleChange'] as (r: string) => void)('EMPLOYEE');
      fixture.detectChanges();
      expect((c['showBranchField'] as () => boolean)()).toBeTruthy();
    });

    it('should hide branch field when role is ADMIN', () => {
      (c['onRoleChange'] as (r: string) => void)('ADMIN');
      expect((c['showBranchField'] as () => boolean)()).toBeFalsy();
    });

    it('should reset branchId to null when switching from MANAGER to ADMIN', () => {
      (c['formBranchId'] as { set(v: number | null): void }).set(1);
      (c['formRole'] as { set(v: string): void }).set('MANAGER');
      expect((c['showBranchField'] as () => boolean)()).toBeTruthy();

      (c['onRoleChange'] as (r: string) => void)('ADMIN');
      expect((c['showBranchField'] as () => boolean)()).toBeFalsy();
      expect((c['formBranchId'] as () => number | null)()).toBeNull();
    });

    it('should normalize branch select values to numbers or null', () => {
      (c['onBranchChange'] as (v: number | string | null) => void)('2');
      expect((c['formBranchId'] as () => number | null)()).toBe(2);

      (c['onBranchChange'] as (v: number | string | null) => void)(null);
      expect((c['formBranchId'] as () => number | null)()).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Dialog lifecycle
  // ---------------------------------------------------------------------------
  describe('dialog', () => {
    beforeEach(() => configureTestingModule());

    it('should open create dialog with empty form and reset validation state', () => {
      (c['formSubmitted'] as { set(v: boolean): void }).set(true);

      (c['openCreateDialog'] as () => void)();

      expect((c['dialogVisible'] as () => boolean)()).toBeTruthy();
      expect((c['editingUser'] as () => unknown)()).toBeNull();
      expect((c['formRole'] as () => string)()).toBe('EMPLOYEE');
      expect((c['formSubmitted'] as () => boolean)()).toBeFalsy();
    });

    it('should open edit dialog with pre-populated form and reset validation state', () => {
      const user = buildUser({ id: 2, role: 'MANAGER', branchId: 1 });
      (c['formSubmitted'] as { set(v: boolean): void }).set(true);

      (c['openEditDialog'] as (u: UserResponse) => void)(user);

      expect((c['dialogVisible'] as () => boolean)()).toBeTruthy();
      expect((c['formEmail'] as () => string)()).toBe(user.email);
      expect((c['formRole'] as () => string)()).toBe('MANAGER');
      expect((c['formBranchId'] as () => number | null)()).toBe(1);
      expect((c['formSubmitted'] as () => boolean)()).toBeFalsy();
    });

    it('should close dialog and reset submitting state', () => {
      (c['dialogVisible'] as { set(v: boolean): void }).set(true);
      (c['submitting'] as { set(v: boolean): void }).set(true);

      (c['closeDialog'] as () => void)();

      expect((c['dialogVisible'] as () => boolean)()).toBeFalsy();
      expect((c['submitting'] as () => boolean)()).toBeFalsy();
    });
  });

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------
  describe('create user', () => {
    beforeEach(() => {
      configureTestingModule();
      (c['openCreateDialog'] as () => void)();
    });

    it('should submit a create request', () => {
      const created = buildUser({ id: 10, email: 'new@lembas.com', role: 'MANAGER', branchId: 1 });
      svc['createUser'].mockReturnValue(of(created));

      (c['formEmail'] as { set(v: string): void }).set('new@lembas.com');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formFirstName'] as { set(v: string): void }).set('New');
      (c['formLastName'] as { set(v: string): void }).set('User');
      (c['formRole'] as { set(v: string): void }).set('MANAGER');
      (c['formBranchId'] as { set(v: number | null): void }).set(1);

      (c['submit'] as () => void)();

      expect(svc['createUser']).toHaveBeenCalledWith({
        email: 'new@lembas.com',
        password: 'Str0ng!Pass',
        firstName: 'New',
        lastName: 'User',
        phone: undefined,
        role: 'MANAGER',
        branchId: 1,
      });
    });

    it('should clear branchId in create payload when role is ADMIN', () => {
      svc['createUser'].mockReturnValue(of(buildUser({ id: 11 })));

      (c['formEmail'] as { set(v: string): void }).set('admin2@lembas.com');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formFirstName'] as { set(v: string): void }).set('Second');
      (c['formLastName'] as { set(v: string): void }).set('Admin');
      (c['formRole'] as { set(v: string): void }).set('ADMIN');
      (c['formBranchId'] as { set(v: number | null): void }).set(2);

      (c['submit'] as () => void)();

      expect(svc['createUser']).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN', branchId: undefined }),
      );
    });

    it('should not submit when required branch is missing', () => {
      (c['formEmail'] as { set(v: string): void }).set('new@lembas.com');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formFirstName'] as { set(v: string): void }).set('New');
      (c['formLastName'] as { set(v: string): void }).set('User');
      (c['formRole'] as { set(v: string): void }).set('EMPLOYEE');
      (c['formBranchId'] as { set(v: number | null): void }).set(null);

      (c['submit'] as () => void)();

      expect(svc['createUser']).not.toHaveBeenCalled();
    });

    it('should show inline feedback when first name and last name are missing', () => {
      (c['formEmail'] as { set(v: string): void }).set('new@lembas.com');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formRole'] as { set(v: string): void }).set('EMPLOYEE');
      (c['formBranchId'] as { set(v: number | null): void }).set(1);

      (c['submit'] as () => void)();
      fixture.detectChanges();

      expect(svc['createUser']).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('El nombre es obligatorio');
      expect(fixture.nativeElement.textContent).toContain('El apellido es obligatorio');
    });
  });

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  describe('update user', () => {
    beforeEach(() => {
      const user = buildUser({ id: 2, role: 'MANAGER', branchId: 1 });
      configureTestingModule([user]);
      (c['openEditDialog'] as (u: UserResponse) => void)(user);
    });

    it('should submit an update request with changed fields only', () => {
      svc['updateUser'].mockReturnValue(of(buildUser()));

      (c['formFirstName'] as { set(v: string): void }).set('Changed');
      (c['submit'] as () => void)();

      expect(svc['updateUser']).toHaveBeenCalledWith(2, { firstName: 'Changed' });
    });

    it('should close dialog when no fields changed', () => {
      (c['submit'] as () => void)();

      expect(svc['updateUser']).not.toHaveBeenCalled();
      expect((c['dialogVisible'] as () => boolean)()).toBeFalsy();
    });

    it('should send blank phone to clear an existing phone number', () => {
      const userWithPhone = buildUser({
        id: 2,
        role: 'MANAGER',
        branchId: 1,
        phone: '+54 351 123 4567',
      });
      (c['editingUser'] as { set(v: UserResponse): void }).set(userWithPhone);
      (c['formPhone'] as { set(v: string): void }).set('');
      svc['updateUser'].mockReturnValue(of({ ...userWithPhone, phone: null }));

      (c['submit'] as () => void)();

      expect(svc['updateUser']).toHaveBeenCalledWith(2, { phone: '' });
    });

    it('should not submit an update request when a new password is too short', () => {
      (c['formPassword'] as { set(v: string): void }).set('short');

      (c['submit'] as () => void)();
      fixture.detectChanges();

      expect(svc['updateUser']).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain(
        'La contrasena debe tener al menos 8 caracteres',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Status toggle
  // ---------------------------------------------------------------------------
  describe('status toggle', () => {
    it('should toggle user enabled state', () => {
      const user = buildUser({
        id: 3,
        email: 'employee@lembas.com',
        role: 'EMPLOYEE',
        enabled: true,
      });
      configureTestingModule([user]);

      const updated = { ...user, enabled: false };
      svc['updateUserStatus'].mockReturnValue(of(updated));

      (c['toggleStatus'] as (u: UserResponse) => void)(user);

      expect(svc['updateUserStatus']).toHaveBeenCalledWith(3, false);
      expect((c['users'] as () => UserResponse[])()[0].enabled).toBeFalsy();
    });
  });
});
