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

    const allNavLinks = Array.from(
      fixture.nativeElement.querySelectorAll('header a'),
    ) as HTMLElement[];
    const ingresar = allNavLinks.find((el) => el.textContent?.trim() === 'Ingresar');
    expect(ingresar).toBeTruthy();

    const registerBtn = fixture.nativeElement.querySelector('.store__cta-btn');
    expect(registerBtn).toBeTruthy();
    expect(registerBtn.textContent.trim()).toBe('Crear cuenta');
  });

  /** Should show user name and hide login/register when authenticated. */
  it('Should_showUserNameAndHideGuestLinks_when_authenticated', () => {
    setup(true, customerUser);

    const loginNavLinks = Array.from(
      fixture.nativeElement.querySelectorAll('header a'),
    ) as HTMLElement[];
    const loginInNav = loginNavLinks.find((el) => el.textContent?.trim() === 'Ingresar');
    expect(loginInNav).toBeUndefined();

    const navCta = fixture.nativeElement.querySelector('.store__cta-btn');
    expect(navCta).toBeNull();

    const allSpans: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('span'));
    const userSpan = allSpans.find((el) => el.textContent?.trim() === 'Frodo');
    expect(userSpan).toBeTruthy();
  });

  /** Should render user menu trigger when authenticated. */
  it('Should_renderUserMenuTrigger_when_authenticated', () => {
    setup(true, customerUser);

    const trigger = fixture.nativeElement.querySelector('.store__menu-btn');
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

  /** Should render minimal footer with links. */
  it('Should_renderFooter_when_rendered', () => {
    setup(false);

    const footer = fixture.nativeElement.querySelector('.store__footer');
    expect(footer).toBeTruthy();

    const links = fixture.nativeElement.querySelectorAll('.store__footer-link');
    expect(links.length).toBeGreaterThan(0);
  });

  /** Should render Leaf CTA floating button. */

});
