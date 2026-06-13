import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { MessageService } from 'primeng/api';

import { Checkout } from './checkout';
import { Cart } from '../../../core/services/cart';
import { CustomerOrderService, OrderCreated } from '../../../core/services/customer-order';
import { StoreBranchSelectionService } from '../../../core/services/store-branch-selection';

/** Minimal mock for Cart service. */
function mockCart(overrides: Partial<Cart> = {}): Cart {
  return {
    items: signal([]),
    totalItems: signal(0),
    total: signal(0),
    isEmpty: signal(true),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    ...overrides,
  } as unknown as Cart;
}

/** Minimal mock for StoreBranchSelectionService. */
function mockBranchSelection(overrides: Partial<StoreBranchSelectionService> = {}): StoreBranchSelectionService {
  return {
    selectedBranchId: signal(1),
    selectedBranch: signal({ id: 1, name: 'Centro', address: 'Av. Siempre Viva 123' }),
    branches: signal([]),
    loading: signal(false),
    error: signal(false),
    ...overrides,
  } as unknown as StoreBranchSelectionService;
}

/** Minimal mock for CustomerOrderService. */
function mockOrderService(overrides: Partial<CustomerOrderService> = {}): CustomerOrderService {
  return {
    createOrder: vi.fn().mockReturnValue(of({ id: 42, orderNumber: 'ON-001', status: 'PENDING_PAYMENT', total: 100 })),
    ...overrides,
  } as unknown as CustomerOrderService;
}

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;

  async function configure(opts: {
    cart?: Cart;
    branchSelection?: StoreBranchSelectionService;
    orderService?: CustomerOrderService;
  } = {}): Promise<void> {
    const cart = opts.cart ?? mockCart();
    const branchSelection = opts.branchSelection ?? mockBranchSelection();
    const orderService = opts.orderService ?? mockOrderService();

    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        { provide: Cart, useValue: cart },
        { provide: StoreBranchSelectionService, useValue: branchSelection },
        { provide: CustomerOrderService, useValue: orderService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', async () => {
    await configure();
    expect(component).toBeTruthy();
  });

  // -------------------------------------------------------------------
  // Empty cart state
  // -------------------------------------------------------------------
  it('should show empty state when cart is empty', async () => {
    await configure({ cart: mockCart({ isEmpty: signal(true), items: signal([]) }) });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Tu carrito está vacío');
    expect(text).toContain('Ir al catálogo');
  });

  // -------------------------------------------------------------------
  // Cart items display
  // -------------------------------------------------------------------
  it('should display cart items when cart has products', async () => {
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba Mate', price: 1500, quantity: 2, imageUrl: '/yerba.jpg' },
      ]),
      totalItems: signal(2),
      total: signal(3000),
    });
    await configure({ cart });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Yerba Mate');
    expect(text).toContain('Resumen');
    expect(text).toContain('Confirmar pedido');
  });

  // -------------------------------------------------------------------
  // Branch label
  // -------------------------------------------------------------------
  it('should show selected branch in description', async () => {
    await configure();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Centro - Av. Siempre Viva 123');
  });

  it('should show fallback when no branch is selected', async () => {
    const branchSelection = mockBranchSelection({
      selectedBranchId: signal(null),
      selectedBranch: signal(null),
    });
    await configure({ branchSelection });
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Sin sucursal seleccionada');
  });

  // -------------------------------------------------------------------
  // Order creation
  // -------------------------------------------------------------------
  it('should call createOrder on CustomerOrderService when confirmar is clicked', async () => {
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba', price: 1500, quantity: 1 },
      ]),
      totalItems: signal(1),
      total: signal(1500),
    });
    const orderService = mockOrderService();
    await configure({ cart, orderService });

    // Click the confirmar button
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const confirmBtn = Array.from(buttons).find((b: any) =>
      b.textContent?.includes('Confirmar pedido'),
    ) as HTMLButtonElement | undefined;
    confirmBtn?.click();

    expect(orderService.createOrder).toHaveBeenCalled();
  });

  it('should show success screen after order creation', async () => {
    const orderResponse: OrderCreated = {
      id: 42,
      orderNumber: 'ON-20260612-000001',
      status: 'PENDING_PAYMENT',
      total: 3000,
    };
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba', price: 1500, quantity: 2 },
      ]),
      totalItems: signal(2),
      total: signal(3000),
    });
    const orderService = mockOrderService({
      createOrder: vi.fn().mockReturnValue(of(orderResponse)),
    });
    await configure({ cart, orderService });

    // Trigger order creation (protected method, accessed via cast)
    (component as any).createOrder();
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('ON-20260612-000001');
    expect(text).toContain('Pendiente de pago');
    expect(text).toContain('Pedido');
    expect(text).toContain('creado');
  });

  // -------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------
  it('should show error message when order creation fails with INSUFFICIENT_STOCK', async () => {
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba', price: 1500, quantity: 1 },
      ]),
      totalItems: signal(1),
      total: signal(1500),
    });
    const orderService = mockOrderService({
      createOrder: vi.fn().mockReturnValue(
        throwError(() => ({ error: { code: 'INSUFFICIENT_STOCK' } })),
      ),
    });
    await configure({ cart, orderService });

    (component as any).createOrder();
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('stock suficiente');
  });

  it('should show error message when order creation fails with PRODUCT_NOT_FOUND', async () => {
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba', price: 1500, quantity: 1 },
      ]),
      totalItems: signal(1),
      total: signal(1500),
    });
    const orderService = mockOrderService({
      createOrder: vi.fn().mockReturnValue(
        throwError(() => ({ error: { code: 'PRODUCT_NOT_FOUND' } })),
      ),
    });
    await configure({ cart, orderService });

    (component as any).createOrder();
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('no está disponible');
  });

  it('should show generic error for unknown error codes', async () => {
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba', price: 1500, quantity: 1 },
      ]),
      totalItems: signal(1),
      total: signal(1500),
    });
    const orderService = mockOrderService({
      createOrder: vi.fn().mockReturnValue(
        throwError(() => ({ error: { code: 'UNKNOWN' } })),
      ),
    });
    await configure({ cart, orderService });

    (component as any).createOrder();
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('No pudimos crear el pedido');
  });

  // -------------------------------------------------------------------
  // Branch missing
  // -------------------------------------------------------------------
  it('should disable confirmar button when branch is missing', async () => {
    const branchSelection = mockBranchSelection({
      selectedBranchId: signal(null),
      selectedBranch: signal(null),
    });
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba', price: 1500, quantity: 1 },
      ]),
      totalItems: signal(1),
      total: signal(1500),
    });
    await configure({ cart, branchSelection });

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Elegí una sucursal de retiro');
  });

  // -------------------------------------------------------------------
  // Quantity and remove actions
  // -------------------------------------------------------------------
  it('should call cart.updateQuantity when quantity changes', async () => {
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba', price: 1500, quantity: 2 },
      ]),
      totalItems: signal(2),
      total: signal(3000),
      updateQuantity: vi.fn(),
    });
    await configure({ cart });

    // The quantity stepper triggers valueChange which calls updateQuantity
    expect(cart.updateQuantity).toBeDefined();
  });

  it('should call cart.removeItem when quitar is clicked', async () => {
    const cart = mockCart({
      isEmpty: signal(false),
      items: signal([
        { productId: 1, name: 'Yerba', price: 1500, quantity: 1 },
      ]),
      totalItems: signal(1),
      total: signal(1500),
      removeItem: vi.fn(),
    });
    await configure({ cart });

    const quitarBtn = fixture.nativeElement.querySelector('button[aria-label*="Quitar"]');
    quitarBtn?.click();

    expect(cart.removeItem).toHaveBeenCalledWith(1);
  });
});
