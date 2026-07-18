import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { MessageService } from 'primeng/api';

import { UserForm } from './user-form';
import { UserService } from '@features/users/data-access/user';
import type { Branch, UserResponse } from '@features/users/domain/user';

/** Builds a fake user response for testing. */
function buildUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 42,
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

/** Sample branches for testing. */
const SAMPLE_BRANCHES: Branch[] = [
  { id: 1, name: 'Centro' },
  { id: 2, name: 'Nueva Cordoba' },
];

/** Type-unsafe helper to access protected component members. */
function unsafe(component: UserForm): Record<string, unknown> {
  return component as unknown as Record<string, unknown>;
}

describe('UserForm', () => {
  let component: UserForm;
  let fixture: ComponentFixture<UserForm>;
  let svc: Record<string, ReturnType<typeof vi.fn>>;
  let c: Record<string, unknown>;

  function configure(): void {
    svc = {
      createUser: vi.fn().mockReturnValue(of(buildUser())),
      updateUser: vi.fn().mockReturnValue(of(buildUser())),
    };

    TestBed.configureTestingModule({
      imports: [UserForm],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: UserService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('branches', SAMPLE_BRANCHES);
    c = unsafe(component);
    fixture.detectChanges();
  }

  // ---------------------------------------------------------------------------
  // Creation
  // ---------------------------------------------------------------------------
  describe('creation', () => {
    it('should create the component', () => {
      configure();
      expect(component).toBeTruthy();
    });

    it('should have dialog closed initially', () => {
      configure();
      expect((c['dialogVisible'] as () => boolean)()).toBeFalsy();
    });
  });

  // ---------------------------------------------------------------------------
  // Email validation
  // ---------------------------------------------------------------------------
  describe('email validation', () => {
    beforeEach(() => configure());

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
  });

  // ---------------------------------------------------------------------------
  // Password validation
  // ---------------------------------------------------------------------------
  describe('password validation', () => {
    beforeEach(() => configure());

    it('should require at least 8 characters in create mode', () => {
      (c['formPassword'] as { set(v: string): void }).set('short');
      expect((c['formPasswordValid'] as () => boolean)()).toBeFalsy();

      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      expect((c['formPasswordValid'] as () => boolean)()).toBeTruthy();
    });

    it('should accept empty password in edit mode', () => {
      (c['editingUser'] as { set(v: unknown): void }).set(buildUser());
      (c['formPassword'] as { set(v: string): void }).set('');
      expect((c['formPasswordValid'] as () => boolean)()).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // Role + Branch show/hide
  // ---------------------------------------------------------------------------
  describe('role / branch interaction', () => {
    beforeEach(() => configure());

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

      (c['onBranchChange'] as (v: number | string | null) => void)('');
      expect((c['formBranchId'] as () => number | null)()).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Dialog lifecycle
  // ---------------------------------------------------------------------------
  describe('dialog lifecycle', () => {
    beforeEach(() => configure());

    it('should open create dialog with empty form and reset validation state', () => {
      (c['formSubmitted'] as { set(v: boolean): void }).set(true);

      component.openCreate();

      expect((c['dialogVisible'] as () => boolean)()).toBeTruthy();
      expect((c['editingUser'] as () => unknown)()).toBeNull();
      expect((c['formRole'] as () => string)()).toBe('EMPLOYEE');
      expect((c['formSubmitted'] as () => boolean)()).toBeFalsy();
    });

    it('should open edit dialog with pre-populated form and reset validation state', () => {
      const user = buildUser({ id: 2, role: 'MANAGER', branchId: 1 });
      (c['formSubmitted'] as { set(v: boolean): void }).set(true);

      component.openEdit(user);

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
  // Create user
  // ---------------------------------------------------------------------------
  describe('create user', () => {
    beforeEach(() => {
      configure();
      component.openCreate();
    });

    it('should submit a create request with all fields', () => {
      svc['createUser'].mockReturnValue(
        of(buildUser({ id: 10, email: 'new@lembas.com', role: 'MANAGER', branchId: 1 })),
      );

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
      expect((c['firstNameErrorMessage'] as () => string)()).toContain('El nombre es obligatorio');
      expect((c['lastNameErrorMessage'] as () => string)()).toContain('El apellido es obligatorio');
    });

    it('should block create submit when email is malformed and show inline feedback', () => {
      component.openCreate();
      (c['formEmail'] as { set(v: string): void }).set('bad-email');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formFirstName'] as { set(v: string): void }).set('Test');
      (c['formLastName'] as { set(v: string): void }).set('User');
      (c['formRole'] as { set(v: string): void }).set('EMPLOYEE');
      (c['formBranchId'] as { set(v: number | null): void }).set(1);

      (c['submit'] as () => void)();
      fixture.detectChanges();

      expect(svc['createUser']).not.toHaveBeenCalled();
      expect((c['emailErrorMessage'] as () => string)()).toContain('Ingrese un email valido');
    });

    it('should emit saved event on successful create', () => {
      svc['createUser'].mockReturnValue(of(buildUser({ id: 13, email: 'emit@lembas.com' })));
      const spy = vi.fn();
      component.saved.subscribe(spy);

      (c['formEmail'] as { set(v: string): void }).set('emit@lembas.com');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formFirstName'] as { set(v: string): void }).set('Emit');
      (c['formLastName'] as { set(v: string): void }).set('Test');
      (c['formRole'] as { set(v: string): void }).set('ADMIN');

      (c['submit'] as () => void)();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should show dialog error on duplicate email', () => {
      const errorResponse = new HttpErrorResponse({
        status: 409,
        error: {
          status: 409,
          code: 'EMAIL_DUPLICATED',
          message: 'A user with this email already exists',
        },
      });
      svc['createUser'].mockReturnValue(throwError(() => errorResponse));

      (c['formEmail'] as { set(v: string): void }).set('exist@lembas.com');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formFirstName'] as { set(v: string): void }).set('Test');
      (c['formLastName'] as { set(v: string): void }).set('User');
      (c['formRole'] as { set(v: string): void }).set('ADMIN');

      (c['submit'] as () => void)();
      fixture.detectChanges();

      expect((c['dialogError'] as () => string)()).toContain('Ya existe un usuario');
    });

    it('should show dialog error on validation error from backend', () => {
      const errorResponse = new HttpErrorResponse({
        status: 400,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { fieldErrors: [{ field: 'email', message: 'must be well-formed' }] },
        },
      });
      svc['createUser'].mockReturnValue(throwError(() => errorResponse));

      (c['formEmail'] as { set(v: string): void }).set('good@email.com');
      (c['formPassword'] as { set(v: string): void }).set('Str0ng!Pass');
      (c['formFirstName'] as { set(v: string): void }).set('Test');
      (c['formLastName'] as { set(v: string): void }).set('User');
      (c['formRole'] as { set(v: string): void }).set('ADMIN');

      (c['submit'] as () => void)();
      fixture.detectChanges();

      expect((c['dialogError'] as () => string)()).toContain('Revise los datos ingresados');
    });
  });

  // ---------------------------------------------------------------------------
  // Update user
  // ---------------------------------------------------------------------------
  describe('update user', () => {
    beforeEach(() => {
      const user = buildUser({ id: 2, role: 'MANAGER', branchId: 1 });
      configure();
      component.openEdit(user);
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
      (c['editingUser'] as { set(v: unknown): void }).set(userWithPhone);
      (c['formPhone'] as { set(v: string): void }).set('');
      svc['updateUser'].mockReturnValue(of({ ...userWithPhone, phone: null }));

      (c['submit'] as () => void)();

      expect(svc['updateUser']).toHaveBeenCalledWith(2, { phone: '' });
    });

    it('should not submit when new password is too short', () => {
      (c['formPassword'] as { set(v: string): void }).set('short');

      (c['submit'] as () => void)();
      fixture.detectChanges();

      expect(svc['updateUser']).not.toHaveBeenCalled();
      expect((c['passwordErrorMessage'] as () => string)()).toContain(
        'La contrasena debe tener al menos 8 caracteres',
      );
    });

    it('should emit saved event on successful update', () => {
      svc['updateUser'].mockReturnValue(of(buildUser()));
      const spy = vi.fn();
      component.saved.subscribe(spy);

      (c['formFirstName'] as { set(v: string): void }).set('Changed');
      (c['submit'] as () => void)();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should show dialog error on update failure', () => {
      const errorResponse = new HttpErrorResponse({
        status: 409,
        error: {
          status: 409,
          code: 'EMAIL_DUPLICATED',
          message: 'A user with this email already exists',
        },
      });
      svc['updateUser'].mockReturnValue(throwError(() => errorResponse));

      (c['formFirstName'] as { set(v: string): void }).set('Changed');
      (c['submit'] as () => void)();
      fixture.detectChanges();

      expect((c['dialogError'] as () => string)()).toContain('Ya existe un usuario');
    });
  });

  // ---------------------------------------------------------------------------
  // Dialog title
  // ---------------------------------------------------------------------------
  describe('dialog title', () => {
    beforeEach(() => configure());

    it('should show "Crear usuario" in create mode', () => {
      component.openCreate();
      expect((c['dialogTitle'] as () => string)()).toBe('Crear usuario');
    });

    it('should show "Editar usuario" in edit mode', () => {
      component.openEdit(buildUser());
      expect((c['dialogTitle'] as () => string)()).toBe('Editar usuario');
    });
  });

  // ---------------------------------------------------------------------------
  // Computed helpers
  // ---------------------------------------------------------------------------
  describe('computed helpers', () => {
    beforeEach(() => configure());

    it('should compute isEditMode correctly', () => {
      expect((c['isEditMode'] as () => boolean)()).toBeFalsy();
      (c['editingUser'] as { set(v: unknown): void }).set(buildUser());
      expect((c['isEditMode'] as () => boolean)()).toBeTruthy();
    });
  });
});
