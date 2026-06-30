import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PosCartComponent } from './pos-cart';
import { PosCartStore } from '../../state/pos-cart.store';

/** Unit tests for {@link PosCartComponent}. */
describe('PosCartComponent', () => {
  let fixture: ComponentFixture<PosCartComponent>;
  let component: PosCartComponent;
  let cart: PosCartStore;

  /** Type-unsafe accessor for protected members (used by resetSelection tests). */
  function unsafe(c: PosCartComponent): Record<string, unknown> {
    return c as unknown as Record<string, unknown>;
  }

  async function createComponent(
    canCheckout = true,
    processing = false,
  ): Promise<void> {
    TestBed.configureTestingModule({
      imports: [PosCartComponent],
      providers: [provideNoopAnimations()],
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(PosCartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('canCheckout', canCheckout);
    fixture.componentRef.setInput('processing', processing);
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();
  }

  afterEach(() => {
    cart.clear();
  });

  it('should create the component', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('renders the empty state when the cart is empty', async () => {
    await createComponent();
    const empty = fixture.nativeElement.querySelector(
      'app-empty-state',
    );
    expect(empty).toBeTruthy();
  });

  it('does not render the totals or checkout button when empty', async () => {
    await createComponent();
    expect(fixture.nativeElement.querySelector('[data-testid="pos-cart-total"]')).toBeFalsy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="pos-checkout-button"]'),
    ).toBeFalsy();
  });

  it('renders one row per cart line with name, quantity, unit price and subtotal', async () => {
    await createComponent();
    cart.addItem({ productId: 1, name: 'Aceite 500ml', unitPrice: 2500 });
    cart.addItem({ productId: 2, name: 'Yerba 1kg', unitPrice: 1800 });
    cart.setQuantity(1, 2);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll(
      '[data-testid^="pos-cart-line-"]',
    );
    expect(rows.length).toBe(2);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aceite 500ml');
    expect(text).toContain('Yerba 1kg');
    // Aceite 2 x $2500 = $5000; Yerba 1 x $1800 = $1800; total = $6800
    expect(text).toContain('5.000,00'); // aceite subtotal
    expect(text).toContain('6.800,00'); // grand total
  });

  it('shows the total formatted as es-AR currency', async () => {
    await createComponent();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 1000 });
    cart.addItem({ productId: 2, name: 'Yerba', unitPrice: 500 });
    fixture.detectChanges();

    const total = fixture.nativeElement.querySelector(
      '[data-testid="pos-cart-total"]',
    ) as HTMLElement;
    expect(total.textContent).toContain('1.500,00');
  });

  it('removes a line when the remove button is clicked', async () => {
    await createComponent();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
    cart.addItem({ productId: 2, name: 'Yerba', unitPrice: 50 });
    fixture.detectChanges();

    const remove = fixture.nativeElement.querySelector(
      '[data-testid="pos-remove-1"]',
    ) as HTMLButtonElement;
    expect(remove).toBeTruthy();
    remove.click();
    fixture.detectChanges();

    expect(cart.lines()).toHaveLength(1);
    expect(cart.lines()[0].productId).toBe(2);
  });

  it('clears the cart and resets the selection when "Vaciar carrito" is clicked', async () => {
    await createComponent();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
    (unsafe(component)['selectedMethod'] as { set(v: string | null): void }).set('CASH');
    (unsafe(component)['cashReceived'] as { set(v: number | null): void }).set(500);
    fixture.detectChanges();

    const clearBtn = fixture.nativeElement.querySelector(
      '[data-testid="pos-clear-button"]',
    ) as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    clearBtn.click();
    fixture.detectChanges();

    expect(cart.lines()).toEqual([]);
    expect((unsafe(component)['selectedMethod'] as () => unknown)()).toBeNull();
    expect((unsafe(component)['cashReceived'] as () => unknown)()).toBeNull();
  });

  it('enables the checkout button when canCheckout and a method are selected', async () => {
    await createComponent(true, false);
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
    (unsafe(component)['selectedMethod'] as { set(v: string | null): void }).set('QR');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="pos-checkout-button"]',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('disables the checkout button when no payment method is selected', async () => {
    await createComponent(true, false);
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="pos-checkout-button"]',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disables the checkout button when canCheckout is false (no cash session)', async () => {
    await createComponent(false, false);
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
    (unsafe(component)['selectedMethod'] as { set(v: string | null): void }).set('QR');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="pos-checkout-button"]',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('disables the checkout button while processing', async () => {
    await createComponent(true, true);
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
    (unsafe(component)['selectedMethod'] as { set(v: string | null): void }).set('QR');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="pos-checkout-button"]',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('requires cashReceived >= total for CASH; shows short/change badges', async () => {
    await createComponent();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 1000 });
    (unsafe(component)['selectedMethod'] as { set(v: string | null): void }).set('CASH');
    fixture.detectChanges();

    // Cash below total: button disabled + short badge
    (unsafe(component)['cashReceived'] as { set(v: number | null): void }).set(500);
    fixture.detectChanges();
    let btn = fixture.nativeElement.querySelector(
      '[data-testid="pos-checkout-button"]',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(
      fixture.nativeElement.querySelector('[data-testid="cash-short"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="cash-change"]'),
    ).toBeFalsy();

    // Exact total: button enabled
    (unsafe(component)['cashReceived'] as { set(v: number | null): void }).set(1000);
    fixture.detectChanges();
    btn = fixture.nativeElement.querySelector(
      '[data-testid="pos-checkout-button"]',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);

    // Above total: change badge shown
    (unsafe(component)['cashReceived'] as { set(v: number | null): void }).set(1500);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="cash-change"]'),
    ).toBeTruthy();
  });

  it('emits checkoutRequested when the user clicks Cobrar and the form is valid', async () => {
    await createComponent();
    cart.addItem({ productId: 1, name: 'Aceite', unitPrice: 100 });
    (unsafe(component)['selectedMethod'] as { set(v: string | null): void }).set('QR');
    fixture.detectChanges();

    let emitted = 0;
    component.checkoutRequested.subscribe(() => emitted++);

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="pos-checkout-button"]',
    ) as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe(1);
  });

  it('resetSelection clears the method and cashReceived', async () => {
    await createComponent();
    (unsafe(component)['selectedMethod'] as { set(v: string | null): void }).set('CASH');
    (unsafe(component)['cashReceived'] as { set(v: number | null): void }).set(1500);
    component.resetSelection();
    expect((unsafe(component)['selectedMethod'] as () => unknown)()).toBeNull();
    expect((unsafe(component)['cashReceived'] as () => unknown)()).toBeNull();
  });
});
