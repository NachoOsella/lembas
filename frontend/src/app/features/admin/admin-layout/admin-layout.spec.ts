import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';
import { Breadcrumb } from 'primeng/breadcrumb';

import { AdminLayout } from './admin-layout';
import { AuthService, AuthUser } from '../../../core/services/auth';

describe('AdminLayout', () => {
  let component: AdminLayout;
  let fixture: ComponentFixture<AdminLayout>;
  let router: Router;
  let currentUserSignal: WritableSignal<AuthUser | null>;
  let isAuthenticatedSignal: any;
  let mockAuthService: Partial<AuthService>;

  const adminUser: AuthUser = {
    id: 2,
    email: 'admin@lembas.com',
    firstName: 'Gandalf',
    lastName: 'Grey',
    role: 'ADMIN',
    branchId: 1,
    branchName: null,
  };

  const jwtHydratedUser: AuthUser = {
    id: 3,
    email: 'employee@lembas.com',
    firstName: null,
    lastName: null,
    role: 'EMPLOYEE',
    branchId: null,
    branchName: null,
  };

  function setup(currentUserValue: AuthUser | null = null) {
    currentUserSignal = signal<AuthUser | null>(currentUserValue);
    mockAuthService = {
      currentUser: currentUserSignal,
      isAuthenticated: signal(currentUserValue !== null),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([
          { path: 'admin', component: {} as any },
          { path: 'admin/dashboard', component: {} as any },
          { path: 'auth/login', component: {} as any },
        ]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayout);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  /** Should create the component with a logged-in user. */
  it('Should_createComponent_when_userIsAuthenticated', () => {
    setup(adminUser);

    expect(component).toBeTruthy();
  });

  /** Should display the user first name when available. */
  it('Should_displayFirstName_when_userHasFirstName', () => {
    setup(adminUser);

    const userName = fixture.nativeElement.querySelector('.topbar__user-name');
    expect(userName).toBeTruthy();
    expect(userName.textContent.trim()).toBe('Gandalf');
  });

  /** Should fall back to email when firstName is null (JWT-hydrated user). */
  it('Should_displayEmail_when_firstNameIsNull', () => {
    setup(jwtHydratedUser);

    const userName = fixture.nativeElement.querySelector('.topbar__user-name');
    expect(userName).toBeTruthy();
    expect(userName.textContent.trim()).toBe('employee@lembas.com');
  });

  /** Should call logout() and navigate to /auth/login when logout is triggered. */
  it('Should_logoutAndRedirect_when_logoutCalled', async () => {
    setup(adminUser);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component['logout']();
    await fixture.whenStable();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  /** Should render the user menu trigger button. */
  it('Should_renderUserMenuTrigger_when_authenticated', () => {
    setup(adminUser);

    const trigger = fixture.nativeElement.querySelector('.topbar__menu-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-label')).toBe('Abrir menu de usuario');
  });
});
