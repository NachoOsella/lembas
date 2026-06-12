import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { computed, signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { StoreLayout } from './store-layout';
import { AuthService, AuthUser } from '../../../core/services/auth';
import { StoreBranchSelectionService } from '../../../core/services/store-branch-selection';

describe('StoreLayout', () => {
  let component: StoreLayout;
  let fixture: ComponentFixture<StoreLayout>;
  let router: Router;
  let currentUserSignal: WritableSignal<AuthUser | null>;
  let isAuthenticatedSignal: any;
  let mockAuthService: Partial<AuthService>;
  let mockBranchSelection: Partial<StoreBranchSelectionService>;

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

    const branchesSignal = signal([{ id: 1, name: 'Centro', address: 'Av. Siempre Viva 123' }]);
    const selectedBranchIdSignal = signal<number | null>(1);
    const loadingSignal = signal(false);
    const errorSignal = signal(false);
    mockBranchSelection = {
      branches: branchesSignal,
      selectedBranchId: selectedBranchIdSignal,
      loading: loadingSignal,
      error: errorSignal,
      selectedBranch: computed(() =>
        branchesSignal().find((branch) => branch.id === selectedBranchIdSignal()) ?? null,
      ),
      loadBranches: vi.fn().mockReturnValue(of(branchesSignal())),
      selectBranch: vi.fn((branchId: number | null) => selectedBranchIdSignal.set(branchId)),
    } as Partial<StoreBranchSelectionService>;

    TestBed.configureTestingModule({
      imports: [StoreLayout],
      providers: [
        provideRouter([]),
        MessageService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: StoreBranchSelectionService, useValue: mockBranchSelection },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreLayout);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  it('should create when guest', () => {
    setup(false);
    expect(component).toBeTruthy();
  });

  it('should create when authenticated', () => {
    setup(true, customerUser);
    expect(component).toBeTruthy();
  });

  it('should render app-store-nav', () => {
    setup(false);
    const nav = fixture.nativeElement.querySelector('app-store-nav');
    expect(nav).toBeTruthy();
  });

  it('should render app-store-footer', () => {
    setup(false);
    const footer = fixture.nativeElement.querySelector('app-store-footer');
    expect(footer).toBeTruthy();
  });

  it('should load public branches on init', () => {
    setup(false);
    expect(mockBranchSelection.loadBranches).toHaveBeenCalledTimes(1);
  });

  it('should pass the selected pickup branch to the store nav', () => {
    setup(false);
    const nav = fixture.nativeElement.querySelector('app-store-nav');
    expect(nav).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Centro - Av. Siempre Viva 123');
  });

  it('should call logout() and navigate to /store', async () => {
    setup(true, customerUser);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.logout();
    await fixture.whenStable();

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/store']);
  });

  it('should navigate to checkout on cart click', async () => {
    setup(false);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.goToCart();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/customer/checkout']);
  });

  it('should navigate to /store/products with query param on search', async () => {
    setup(false);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onSearch('granola');
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/store/products'], {
      queryParams: { q: 'granola' },
    });
  });

  it('should not navigate on empty search query', async () => {
    setup(false);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onSearch('   ');
    await fixture.whenStable();

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
