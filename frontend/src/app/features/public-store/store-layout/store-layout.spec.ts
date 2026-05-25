import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';

import { StoreLayout } from './store-layout';
import { AuthService, AuthUser } from '../../../core/services/auth';

describe('StoreLayout', () => {
  let component: StoreLayout;
  let fixture: ComponentFixture<StoreLayout>;
  let router: Router;
  let currentUserSignal: WritableSignal<AuthUser | null>;
  let isAuthenticatedSignal: any;
  let mockAuthService: Partial<AuthService>;

  const customerUser: AuthUser = {
    id: 1,
    email: 'frodo@lembas.com',
    firstName: 'Frodo',
    lastName: 'Baggins',
    role: 'CUSTOMER',
    branchId: null,
    branchName: null,
  };

  function setup(isAuth: boolean, user: AuthUser | null = null) {
    currentUserSignal = signal<AuthUser | null>(user);
    isAuthenticatedSignal = signal(isAuth);

    mockAuthService = {
      currentUser: currentUserSignal,
      isAuthenticated: isAuthenticatedSignal,
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [StoreLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreLayout);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  /** Should create component when user is not authenticated. */
  it('Should_createComponent_when_guest', () => {
    setup(false);

    expect(component).toBeTruthy();
  });

  /** Should create component when user is authenticated. */
  it('Should_createComponent_when_authenticated', () => {
    setup(true, customerUser);

    expect(component).toBeTruthy();
  });

  /** Should show login/register links when not authenticated. */
  it('Should_showLoginRegisterLinks_when_guest', () => {
    setup(false);

    const loginLink = fixture.nativeElement.querySelector('.store-header__login');
    expect(loginLink).toBeTruthy();
    expect(loginLink.textContent.trim()).toContain('Ingresar');

    const registerLink = fixture.nativeElement.querySelector('a[routerlink="/auth/register"]');
    expect(registerLink).toBeTruthy();
    expect(registerLink.textContent.trim()).toBe('Crear cuenta');
  });

  /** Should show user name and hide login/register when authenticated. */
  it('Should_showUserNameAndHideGuestLinks_when_authenticated', () => {
    setup(true, customerUser);

    const loginLink = fixture.nativeElement.querySelector('.store-header__login');
    expect(loginLink).toBeNull();

    const registerLink = fixture.nativeElement.querySelector('a[routerlink="/auth/register"]');
    expect(registerLink).toBeNull();

    const userName = fixture.nativeElement.querySelector('.store-header__user-name');
    expect(userName).toBeTruthy();
    expect(userName.textContent.trim()).toBe('Frodo');
  });

  /** Should show email when firstName is null (JWT-hydrated user). */
  it('Should_displayEmail_when_firstNameIsNull', () => {
    const jwtUser: AuthUser = {
      id: 4,
      email: 'sam@lembas.com',
      firstName: null,
      lastName: null,
      role: 'CUSTOMER',
      branchId: null,
      branchName: null,
    };

    setup(true, jwtUser);

    const userName = fixture.nativeElement.querySelector('.store-header__user-name');
    expect(userName).toBeTruthy();
    expect(userName.textContent.trim()).toBe('sam@lembas.com');
  });

  /** Should render user menu trigger when authenticated. */
  it('Should_renderUserMenuTrigger_when_authenticated', () => {
    setup(true, customerUser);

    const trigger = fixture.nativeElement.querySelector('.store-header__menu-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-label')).toBe('Abrir menu de usuario');
  });

  /** Should call logout() and navigate to /store when logout is triggered. */
  it('Should_logoutAndRedirectToStore_when_logoutCalled', async () => {
    setup(true, customerUser);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.logout();
    await fixture.whenStable();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/store']);
  });
});
