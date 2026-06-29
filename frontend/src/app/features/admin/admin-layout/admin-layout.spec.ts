import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AdminLayout } from './admin-layout';
import { AuthService, AuthUser } from '../../../core/services/auth';
import { CashService } from '../../../core/services/cash';

describe('AdminLayout', () => {
  let component: AdminLayout;
  let fixture: ComponentFixture<AdminLayout>;
  let router: Router;
  let currentUserSignal: WritableSignal<AuthUser | null>;
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

  const managerUser: AuthUser = {
    id: 4,
    email: 'manager@lembas.com',
    firstName: 'Saruman',
    lastName: 'White',
    role: 'MANAGER',
    branchId: 1,
    branchName: null,
  };

  const employeeUser: AuthUser = {
    id: 5,
    email: 'employee@lembas.com',
    firstName: 'Frodo',
    lastName: 'Baggins',
    role: 'EMPLOYEE',
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
      getUserRole: vi.fn(() => currentUserValue?.role ?? null),
      logout: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([
          { path: 'admin', component: {} as any },
          { path: 'admin/dashboard', component: {} as any },
          { path: 'auth/login', component: {} as any },
        ]),
        MessageService,
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: CashService,
          useValue: {
            currentSession: vi.fn(() =>
              of({
                id: 1,
                status: 'OPEN',
                branchId: 1,
                branchName: 'Centro',
                openingCashAmount: '0',
              } as any),
            ),
          },
        },
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

    const userName = fixture.nativeElement.querySelector('.admin__user-name');
    expect(userName).toBeTruthy();
    expect(userName.textContent.trim()).toBe('Gandalf');
  });

  /** Should fall back to email when firstName is null (JWT-hydrated user). */
  it('Should_displayEmail_when_firstNameIsNull', () => {
    setup(jwtHydratedUser);

    const userName = fixture.nativeElement.querySelector('.admin__user-name');
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

    const trigger = fixture.nativeElement.querySelector('[aria-label="Abrir menu de usuario"]');
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-label')).toBe('Abrir menu de usuario');
  });

  /** Should show all nav items including pricing and Usuarios when role is ADMIN. */
  it('Should_showUsersInSidebar_when_roleIsAdmin', () => {
    setup(adminUser);

    const navLinks: Element[] = Array.from(
      fixture.nativeElement.querySelectorAll('.admin__nav-link'),
    );
    expect(navLinks.length).toBe(14);
    const labels = navLinks.map(
      (el) => el.querySelector('.admin__nav-label')?.textContent?.trim() ?? '',
    );
    expect(labels).toContain('Precios');
    expect(labels).toContain('Usuarios');
  });

  /** Should hide Usuarios but keep pricing in sidebar when role is MANAGER. */
  it('Should_hideUsersFromSidebar_when_roleIsManager', () => {
    setup(managerUser);

    const navLinks: Element[] = Array.from(
      fixture.nativeElement.querySelectorAll('.admin__nav-link'),
    );
    expect(navLinks.length).toBe(13);
    const labels = navLinks.map(
      (el) => el.querySelector('.admin__nav-label')?.textContent?.trim() ?? '',
    );
    expect(labels).toContain('Precios');
    expect(labels).not.toContain('Usuarios');
  });

  /** Should display the open-cash indicator dot on the Caja nav item for branch users. */
  it('Should_showCashIndicator_when_employeeHasOpenCashSession', () => {
    setup(employeeUser);

    const indicator = fixture.nativeElement.querySelector('.admin__nav-indicator');
    expect(indicator).toBeTruthy();
    expect(component['hasOpenCashSession']()).toBe(true);
  });

  /** Should hide Usuarios but keep pricing in sidebar when role is EMPLOYEE. */
  it('Should_hideUsersFromSidebar_when_roleIsEmployee', () => {
    setup(employeeUser);

    const navLinks: Element[] = Array.from(
      fixture.nativeElement.querySelectorAll('.admin__nav-link'),
    );
    expect(navLinks.length).toBe(13);
    const labels = navLinks.map(
      (el) => el.querySelector('.admin__nav-label')?.textContent?.trim() ?? '',
    );
    expect(labels).toContain('Precios');
    expect(labels).not.toContain('Usuarios');
  });
});
