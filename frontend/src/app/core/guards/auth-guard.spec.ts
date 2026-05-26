import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { authGuard, adminGuard, adminOnlyGuard, customerGuard, guestGuard } from './auth-guard';
import { AuthService } from '../services/auth';

/** Role abbreviations accepted by the mock service. */
type MockRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER' | null;

function setupGuard({
  isAuthenticated = false,
  role = null as MockRole,
}: {
  isAuthenticated?: boolean;
  role?: MockRole;
} = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'auth/login', component: {} as any },
        { path: 'store', component: {} as any },
        { path: 'admin', component: {} as any },
        { path: 'admin/dashboard', component: {} as any },
      ]),
      {
        provide: AuthService,
        useValue: {
          isAuthenticated: vi.fn(() => isAuthenticated),
          getUserRole: vi.fn(() => role),
        },
      },
    ],
  });
}

describe('Auth guard', () => {
  it('Should_returnTrue_when_authenticated', () => {
    setupGuard({ isAuthenticated: true, role: 'CUSTOMER' });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('Should_redirectToLogin_when_notAuthenticated', () => {
    setupGuard({ isAuthenticated: false });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    const router = TestBed.inject(Router);

    expect(router.isActive('/auth/login', true)).toBe(false);
    // UrlTree resolves to the login path
    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('auth');
  });
});

describe('Admin guard', () => {
  it('Should_returnTrue_when_roleIsAdmin', () => {
    setupGuard({ isAuthenticated: true, role: 'ADMIN' });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('Should_returnTrue_when_roleIsManager', () => {
    setupGuard({ isAuthenticated: true, role: 'MANAGER' });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('Should_returnTrue_when_roleIsEmployee', () => {
    setupGuard({ isAuthenticated: true, role: 'EMPLOYEE' });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('Should_redirectToLogin_when_notAuthenticated', () => {
    setupGuard({ isAuthenticated: false });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('auth');
  });

  it('Should_redirectToStore_when_roleIsCustomer', () => {
    setupGuard({ isAuthenticated: true, role: 'CUSTOMER' });

    const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('store');
  });
});

describe('Guest guard', () => {
  it('Should_returnTrue_when_notAuthenticated', () => {
    setupGuard({ isAuthenticated: false });

    const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('Should_redirectToStore_when_roleIsCustomer', () => {
    setupGuard({ isAuthenticated: true, role: 'CUSTOMER' });

    const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('store');
  });

  it('Should_redirectToAdmin_when_roleIsStaff', () => {
    setupGuard({ isAuthenticated: true, role: 'ADMIN' });

    const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('admin');
  });
});

describe('Customer guard', () => {
  it('Should_returnTrue_when_roleIsCustomer', () => {
    setupGuard({ isAuthenticated: true, role: 'CUSTOMER' });

    const result = TestBed.runInInjectionContext(() => customerGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('Should_redirectToLogin_when_notAuthenticated', () => {
    setupGuard({ isAuthenticated: false });

    const result = TestBed.runInInjectionContext(() => customerGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('auth');
  });

  it('Should_redirectToAdmin_when_roleIsStaff', () => {
    setupGuard({ isAuthenticated: true, role: 'ADMIN' });

    const result = TestBed.runInInjectionContext(() => customerGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('admin');
  });
});

describe('Admin-only guard', () => {
  it('Should_returnTrue_when_roleIsAdmin', () => {
    setupGuard({ isAuthenticated: true, role: 'ADMIN' });

    const result = TestBed.runInInjectionContext(() => adminOnlyGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('Should_redirectToDashboard_when_roleIsManager', () => {
    setupGuard({ isAuthenticated: true, role: 'MANAGER' });

    const result = TestBed.runInInjectionContext(() => adminOnlyGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('admin');
    expect((result as any)?.root?.children?.primary?.segments?.[1]?.path).toBe('dashboard');
  });

  it('Should_redirectToDashboard_when_roleIsEmployee', () => {
    setupGuard({ isAuthenticated: true, role: 'EMPLOYEE' });

    const result = TestBed.runInInjectionContext(() => adminOnlyGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('admin');
    expect((result as any)?.root?.children?.primary?.segments?.[1]?.path).toBe('dashboard');
  });

  it('Should_redirectToLogin_when_notAuthenticated', () => {
    setupGuard({ isAuthenticated: false });

    const result = TestBed.runInInjectionContext(() => adminOnlyGuard({} as any, {} as any));

    expect(result).not.toBe(false);
    expect(result).not.toBe(true);
    expect((result as any)?.root?.children?.primary?.segments?.[0]?.path).toBe('auth');
  });
});
