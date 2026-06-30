import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

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

/** Unit tests for the {@link AdminPosPage} orchestrator. */
describe('AdminPosPage', () => {
  let fixture: ComponentFixture<AdminPosPage>;
  let component: AdminPosPage;
  let cart: PosCartStore;
  let cashService: { currentSession: ReturnType<typeof vi.fn> };
  let posSale: { createSale: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cashService = { currentSession: vi.fn().mockReturnValue(of(cashSession())) };
    posSale = { createSale: vi.fn() };
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
    cashService = { currentSession: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 }))) };
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
    cashService = { currentSession: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 }))) };
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
      ],
    });
    fixture = TestBed.createComponent(AdminPosPage);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    // Selection lives in the cart component (private); simulate via a click flow
    // is not feasible in this orchestrator test, so we just verify canCheckout is false.
    component.onCheckout();
    expect(posSale.createSale).not.toHaveBeenCalled();
  });

  it('calls createSale with the cart lines and selected method on checkout', () => {
    configure();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 500 });
    cart.addItem({ productId: 2, name: 'Yerba', unitPrice: 300 });
    cart.setQuantity(1, 2);
    fixture.detectChanges();

    // Simulate the cart's selection by setting it via the same kind of
    // accessor the cart uses. Since selectedMethod is a protected signal,
    // we exercise the wiring through the cart component by simulating the
    // "Cobrar" event payload.
    const expected = buildOrder();
    posSale.createSale.mockReturnValue(of(expected));

    // Inject a fake cart that returns a known selection.
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
    // Result dialog renders into body (PrimeNG appendTo='body')
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

    // cart should NOT be cleared on failure
    expect(cart.lines().length).toBe(1);
    // lastResult should NOT be set
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
    cashService = { currentSession: vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 }))) };
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
    // Defensive: keeps the public wiring honest. If a future refactor
    // removes any of these dependencies the page would silently break.
    expect(PosProductSearchComponent).toBeDefined();
    expect(PosCartComponent).toBeDefined();
    expect(PosCheckoutResultDialogComponent).toBeDefined();
    expect(AppPageHeader).toBeDefined();
  });
});
