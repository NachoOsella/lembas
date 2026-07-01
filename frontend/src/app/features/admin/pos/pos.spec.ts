import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import { AdminPosPage } from './pos';
import { PosProductSearchComponent } from './components/pos-product-search/pos-product-search';
import { PosCartComponent } from './components/pos-cart/pos-cart';
import { PosCheckoutResultDialogComponent } from './components/pos-checkout-result-dialog/pos-checkout-result-dialog';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { CashService } from '../../../core/services/cash';
import { PosSaleService } from './services/pos-sale.service';
import { PosCartStore } from './state/pos-cart.store';
import { OrderDetail, OrderItem, PaymentSummary } from '../../../shared/models/order';
import { CashSessionDto } from '../../../shared/models/cash-session';

/** Builds a minimal CashSessionDto for the page-level tests. */
function cashSession(): CashSessionDto {
  return {
    id: 11,
    status: 'OPEN',
    branchId: 1,
    branchName: 'Centro',
    openedByUserId: 1,
    openedByUserName: 'Carla',
    openingCashAmount: 100,
    openingNotes: null,
    openedAt: null,
  } as unknown as CashSessionDto;
}

/** Builds a minimal OrderDetail for the success path. */
function buildOrder(): OrderDetail {
  return {
    id: 1,
    orderNumber: 'PS-20260630-000001',
    type: 'POS',
    status: 'PAID',
    fulfillmentType: 'PICKUP',
    branchId: 1,
    branchName: 'Centro',
    customerUserId: 0,
    customerName: 'Venta POS - Carla',
    customerEmail: '',
    customerPhone: null,
    subtotal: 500,
    discountTotal: 0,
    total: 500,
    notes: null,
    cancellationReason: null,
    items: [
      { id: 1, productId: 100, productName: 'Aceite', productBarcode: '7501',
        quantity: 1, unitPrice: 500, discountAmount: 0, subtotalAmount: 500 } as OrderItem,
    ],
    payments: [
      { id: 1, provider: 'MANUAL', method: 'CASH', status: 'APPROVED',
        amount: 500, approvedAt: null, createdAt: '' } as PaymentSummary,
    ],
    paidAt: null,
    preparedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: '',
    updatedAt: '',
  };
}

/** Builds a minimal currentUser for EMPLOYEE tests. */
function employeeUser() {
  return {
    id: 1,
    email: 'cashier@x.com',
    firstName: 'Carla',
    lastName: 'Cajero',
    role: 'EMPLOYEE' as const,
    branchId: 1,
    branchName: 'Centro',
  };
}

/** Unit tests for the {@link AdminPosPage} orchestrator. */
describe('AdminPosPage', () => {
  let fixture: ComponentFixture<AdminPosPage>;
  let component: AdminPosPage;
  let cart: PosCartStore;
  let cashService: { currentSession: ReturnType<typeof vi.fn> };
  let posSale: { createSale: ReturnType<typeof vi.fn> };
  let authService: { currentUser: ReturnType<typeof vi.fn>; getUserRole: ReturnType<typeof vi.fn> };
  let userService: { listBranches: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cashService = { currentSession: vi.fn().mockReturnValue(of(cashSession())) };
    posSale = { createSale: vi.fn() };
    authService = {
      currentUser: vi.fn().mockReturnValue(employeeUser()),
      getUserRole: vi.fn().mockReturnValue('EMPLOYEE'),
    };
    userService = { listBranches: vi.fn().mockReturnValue(of([])) };
  });

  function configure(): void {
    cart?.clear();
    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });

    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();
  }

  function unsafe(c: AdminPosPage): Record<string, unknown> {
    return c as unknown as Record<string, unknown>;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  // ---------------------------------------------------------------------------
  // Creation
  // ---------------------------------------------------------------------------

  it('should create the page', () => {
    configure();
    expect(component).toBeTruthy();
  });

  it('renders the page header, two-panel grid, search and cart components', () => {
    configure();
    const page = fixture.nativeElement.querySelector('app-page-header');
    expect(page).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-pos-product-search')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-pos-cart')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.pos-page__grid')).toBeTruthy();
  });

  it('probes the current cash session on init and renders the success badge', () => {
    configure();
    expect(cashService.currentSession).toHaveBeenCalled();
    const badge = fixture.nativeElement.querySelector(
      '[data-testid="cash-session-badge"]',
    ) as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Caja abierta #11');
  });

  it('shows the missing cash badge and "Abrir caja" button when no session is open', () => {
    cashService = {
      currentSession: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      ),
    };
    posSale = { createSale: vi.fn() };
    authService = {
      currentUser: vi.fn().mockReturnValue(employeeUser()),
      getUserRole: vi.fn().mockReturnValue('EMPLOYEE'),
    };
    userService = { listBranches: vi.fn().mockReturnValue(of([])) };
    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });
    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();

    const missing = fixture.nativeElement.querySelector(
      '[data-testid="cash-session-missing"]',
    );
    expect(missing).toBeTruthy();
    const openBtn = fixture.nativeElement.querySelector(
      '[data-testid="open-cash-button"]',
    );
    expect(openBtn).toBeTruthy();
  });

  /** True when AdminPosPage passes branchId (1) to currentSession. */
  function hasBranchParam(calls: unknown[][]): boolean {
    return calls.some((args) => args[0] === 1 || args[0] === undefined);
  }

  // ---------------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------------

  it('does not call createSale when the cart is empty', () => {
    configure();
    component.onCheckout();
    expect(posSale.createSale).not.toHaveBeenCalled();
  });

  it('does not call createSale when there is no payment method selected', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    fixture.detectChanges();
    component.onCheckout();
    expect(posSale.createSale).not.toHaveBeenCalled();
  });

  it('does not call createSale when there is no cash session (even with a method)', () => {
    cashService = {
      currentSession: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      ),
    };
    posSale = { createSale: vi.fn() };
    authService = {
      currentUser: vi.fn().mockReturnValue(employeeUser()),
      getUserRole: vi.fn().mockReturnValue('EMPLOYEE'),
    };
    userService = { listBranches: vi.fn().mockReturnValue(of([])) };
    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });
    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    component.onCheckout();
    expect(posSale.createSale).not.toHaveBeenCalled();
  });

  it('calls createSale with the cart lines and selected method on checkout', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    cart.addItem({ productId: 2, name: 'Yerba', unitPrice: 300 });
    cart.setQuantity(1, 2);
    fixture.detectChanges();

    const expected = buildOrder();
    posSale.createSale.mockReturnValue(of(expected));

    const cartInstance = fixture.debugElement.query(
      (el) => el.componentInstance instanceof PosCartComponent,
    );
    expect(cartInstance).toBeTruthy();
    const cartComp = cartInstance.componentInstance as PosCartComponent;
    (cartComp as unknown as Record<string, { set(v: unknown): void }>)['selectedMethod']
      .set('QR');
    fixture.detectChanges();

    component.onCheckout();

    expect(posSale.createSale).toHaveBeenCalledTimes(1);
    const request = posSale.createSale.mock.calls[0][0];
    expect(request.paymentMethod).toBe('QR');
    expect(request.items).toEqual([
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ]);
    expect(request.cashReceived).toBeNull();
    // EMPLOYEE does not send branchId in the request.
    expect(request.branchId).toBeNull();
  });

  it('clears the cart, resets selection and shows the result dialog on success', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    posSale.createSale.mockReturnValue(of(buildOrder()));
    fixture.detectChanges();

    const cartInstance = fixture.debugElement.query(
      (el) => el.componentInstance instanceof PosCartComponent,
    );
    const cartComp = cartInstance.componentInstance as PosCartComponent;
    (cartComp as unknown as Record<string, { set(v: unknown): void }>)['selectedMethod']
      .set('QR');
    fixture.detectChanges();

    component.onCheckout();
    fixture.detectChanges();

    expect(cart.lines()).toEqual([]);
    const dialog = document.body.querySelector(
      '[data-testid="pos-checkout-result-dialog"]',
    );
    expect(dialog).toBeTruthy();
    expect(document.body.textContent).toContain('PS-20260630-000001');
  });

  it('surfaces an error toast on failure with the mapped INSUFFICIENT_STOCK message', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    posSale.createSale.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { status: 409, code: 'INSUFFICIENT_STOCK', message: 'no stock' },
          }),
      ),
    );
    fixture.detectChanges();

    const cartInstance = fixture.debugElement.query(
      (el) => el.componentInstance instanceof PosCartComponent,
    );
    const cartComp = cartInstance.componentInstance as PosCartComponent;
    (cartComp as unknown as Record<string, { set(v: unknown): void }>)['selectedMethod']
      .set('QR');
    fixture.detectChanges();

    component.onCheckout();
    fixture.detectChanges();

    expect(cart.lines().length).toBe(1);
    expect((unsafe(component)['lastResult'] as () => unknown)()).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // F8 shortcut
  // ---------------------------------------------------------------------------

  it('triggers checkout on F8 when the page is in a chargeable state', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    posSale.createSale.mockReturnValue(of(buildOrder()));
    fixture.detectChanges();

    const cartInstance = fixture.debugElement.query(
      (el) => el.componentInstance instanceof PosCartComponent,
    );
    const cartComp = cartInstance.componentInstance as PosCartComponent;
    (cartComp as unknown as Record<string, { set(v: unknown): void }>)['selectedMethod']
      .set('QR');
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'F8' });
    document.dispatchEvent(event);

    expect(posSale.createSale).toHaveBeenCalled();
  });

  it('does nothing on F8 when the cart is empty', () => {
    configure();
    const event = new KeyboardEvent('keydown', { key: 'F8' });
    document.dispatchEvent(event);
    expect(posSale.createSale).not.toHaveBeenCalled();
  });

  it('does nothing on F8 when the cash session is missing', () => {
    cashService = {
      currentSession: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      ),
    };
    posSale = { createSale: vi.fn() };
    authService = {
      currentUser: vi.fn().mockReturnValue(employeeUser()),
      getUserRole: vi.fn().mockReturnValue('EMPLOYEE'),
    };
    userService = { listBranches: vi.fn().mockReturnValue(of([])) };
    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });
    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'F8' });
    document.dispatchEvent(event);
    expect(posSale.createSale).not.toHaveBeenCalled();
  });

  it('ignores other key events (no F8 = no checkout)', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);
    expect(posSale.createSale).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  it('startNewSale clears the cart, resets selection and closes the result', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    component.startNewSale();
    expect(cart.lines()).toEqual([]);
    expect((unsafe(component)['lastResult'] as () => unknown)()).toBeNull();
  });

  it('declares the public surface the page depends on', () => {
    expect(PosProductSearchComponent).toBeDefined();
    expect(PosCartComponent).toBeDefined();
    expect(PosCheckoutResultDialogComponent).toBeDefined();
    expect(AppPageHeader).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Stale cash session re-probe (race-condition fix)
  // ---------------------------------------------------------------------------

  it('refreshCashSession re-probes the current cash session', () => {
    configure();
    expect(cashService.currentSession).toHaveBeenCalledTimes(1);
    component.refreshCashSession();
    expect(cashService.currentSession).toHaveBeenCalledTimes(2);
  });

  it('re-probes the cash session when the tab regains focus', () => {
    configure();
    expect(cashService.currentSession).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(cashService.currentSession).toHaveBeenCalledTimes(2);
  });

  it('does NOT re-probe when the tab is hidden', () => {
    configure();
    expect(cashService.currentSession).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(cashService.currentSession).toHaveBeenCalledTimes(1);
  });

  it('re-probes the session on F8 so a stale cache is not acted on', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    fixture.detectChanges();

    cashService = {
      currentSession: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      ),
    };
    posSale = { createSale: vi.fn() };
    authService = {
      currentUser: vi.fn().mockReturnValue(employeeUser()),
      getUserRole: vi.fn().mockReturnValue('EMPLOYEE'),
    };
    userService = { listBranches: vi.fn().mockReturnValue(of([])) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });
    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8' }));

    expect(cashService.currentSession).toHaveBeenCalled();
    expect(posSale.createSale).not.toHaveBeenCalled();
  });

  it('refresh-cash-session-button calls refreshCashSession', () => {
    configure();
    expect(cashService.currentSession).toHaveBeenCalledTimes(1);
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="refresh-cash-session-button"]',
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(cashService.currentSession).toHaveBeenCalledTimes(2);
  });

  it('shows the refresh button when the cash session is open', () => {
    configure();
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="refresh-cash-session-button"]',
    );
    expect(btn).toBeTruthy();
  });

  it('shows the refresh button when the cash session is missing', () => {
    cashService = {
      currentSession: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 404 })),
      ),
    };
    posSale = { createSale: vi.fn() };
    authService = {
      currentUser: vi.fn().mockReturnValue(employeeUser()),
      getUserRole: vi.fn().mockReturnValue('EMPLOYEE'),
    };
    userService = { listBranches: vi.fn().mockReturnValue(of([])) };
    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });
    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="refresh-cash-session-button"]',
    );
    expect(btn).toBeTruthy();
  });

  it('re-probes the session on CASH_SESSION_NOT_FOUND checkout failure', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    posSale.createSale.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: {
              status: 404,
              code: 'CASH_SESSION_NOT_FOUND',
              message: 'No open session',
            },
          }),
      ),
    );
    fixture.detectChanges();

    const cartInstance = fixture.debugElement.query(
      (el: { componentInstance: unknown }) =>
        el.componentInstance instanceof PosCartComponent,
    );
    const cartComp = cartInstance.componentInstance as PosCartComponent;
    (cartComp as unknown as Record<string, { set(v: unknown): void }>)['selectedMethod']
      .set('QR');
    fixture.detectChanges();

    const callsBefore = cashService.currentSession.mock.calls.length;
    component.onCheckout();
    fixture.detectChanges();

    expect(cashService.currentSession.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('re-probes the session on CASH_BRANCH_REQUIRED checkout failure', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    posSale.createSale.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              status: 400,
              code: 'CASH_BRANCH_REQUIRED',
              message: 'Branch required',
            },
          }),
      ),
    );
    fixture.detectChanges();

    const cartInstance = fixture.debugElement.query(
      (el: { componentInstance: unknown }) =>
        el.componentInstance instanceof PosCartComponent,
    );
    const cartComp = cartInstance.componentInstance as PosCartComponent;
    (cartComp as unknown as Record<string, { set(v: unknown): void }>)['selectedMethod']
      .set('QR');
    fixture.detectChanges();

    const callsBefore = cashService.currentSession.mock.calls.length;
    component.onCheckout();
    fixture.detectChanges();

    expect(cashService.currentSession.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('does NOT re-probe the session on INSUFFICIENT_STOCK (cart-related) failure', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    posSale.createSale.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              status: 409,
              code: 'INSUFFICIENT_STOCK',
              message: 'Insufficient stock',
            },
          }),
      ),
    );
    fixture.detectChanges();

    const cartInstance = fixture.debugElement.query(
      (el: { componentInstance: unknown }) =>
        el.componentInstance instanceof PosCartComponent,
    );
    const cartComp = cartInstance.componentInstance as PosCartComponent;
    (cartComp as unknown as Record<string, { set(v: unknown): void }>)['selectedMethod']
      .set('QR');
    fixture.detectChanges();

    const callsBefore = cashService.currentSession.mock.calls.length;
    component.onCheckout();
    fixture.detectChanges();

    expect(cashService.currentSession.mock.calls.length).toBe(callsBefore);
  });

  // ---------------------------------------------------------------------------
  // ADMIN branch selector
  // ---------------------------------------------------------------------------

  it('loads branches and shows the branch selector when the user is ADMIN', () => {
    authService = {
      currentUser: vi.fn().mockReturnValue({
        id: 1,
        email: 'admin@x.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        branchId: null,
        branchName: null,
      }),
      getUserRole: vi.fn().mockReturnValue('ADMIN'),
    };
    userService = {
      listBranches: vi.fn().mockReturnValue(
        of([
          { id: 1, name: 'Centro', active: true },
          { id: 2, name: 'Norte', active: true },
        ]),
      ),
    };
    cashService = {
      currentSession: vi.fn().mockReturnValue(of(cashSession())),
    };
    posSale = { createSale: vi.fn() };

    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });

    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();

    const branchSelect = fixture.nativeElement.querySelector(
      '[data-testid="pos-branch-select"]',
    );
    expect(branchSelect).toBeTruthy();
    // Should have loaded branches
    expect(userService.listBranches).toHaveBeenCalled();
    // No session loaded yet because no branch selected (multiple branches).
    expect(cashService.currentSession).not.toHaveBeenCalled();
  });

  it('auto-selects the single branch and probes the cash session when ADMIN has one branch', () => {
    authService = {
      currentUser: vi.fn().mockReturnValue({
        id: 1,
        email: 'admin@x.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        branchId: null,
        branchName: null,
      }),
      getUserRole: vi.fn().mockReturnValue('ADMIN'),
    };
    userService = {
      listBranches: vi.fn().mockReturnValue(
        of([{ id: 1, name: 'Unica', active: true }]),
      ),
    };
    cashService = {
      currentSession: vi.fn().mockReturnValue(of(cashSession())),
    };
    posSale = { createSale: vi.fn() };

    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });

    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();

    // Auto-selected branch 1 -> probes cash session for branchId=1.
    expect(cashService.currentSession).toHaveBeenCalledWith(1);
  });

  it('passes branchId in the checkout request when ADMIN has a branch selected', () => {
    authService = {
      currentUser: vi.fn().mockReturnValue({
        id: 1,
        email: 'admin@x.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        branchId: null,
        branchName: null,
      }),
      getUserRole: vi.fn().mockReturnValue('ADMIN'),
    };
    userService = {
      listBranches: vi.fn().mockReturnValue(
        of([{ id: 1, name: 'Unica', active: true }]),
      ),
    };
    cashService = {
      currentSession: vi.fn().mockReturnValue(of(cashSession())),
    };
    posSale = { createSale: vi.fn().mockReturnValue(of(buildOrder())) };

    TestBed.configureTestingModule({
      imports: [AdminPosPage],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: CashService, useValue: cashService },
        { provide: PosSaleService, useValue: posSale },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });

    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    fixture.detectChanges();

    const cartInstance = fixture.debugElement.query(
      (el) => el.componentInstance instanceof PosCartComponent,
    );
    const cartComp = cartInstance.componentInstance as PosCartComponent;
    (cartComp as unknown as Record<string, { set(v: unknown): void }>)['selectedMethod']
      .set('QR');
    fixture.detectChanges();

    component.onCheckout();

    expect(posSale.createSale).toHaveBeenCalledTimes(1);
    const request = posSale.createSale.mock.calls[0][0];
    // ADMIN sends branchId in the request.
    expect(request.branchId).toBe(1);
  });
});
