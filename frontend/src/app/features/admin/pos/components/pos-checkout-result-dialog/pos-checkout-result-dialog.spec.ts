import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PosCheckoutResultDialogComponent } from './pos-checkout-result-dialog';
import type { OrderDetail, OrderItem, PaymentSummary } from '@features/orders/domain/order';

/** Builds a minimal OrderDetail for the receipt. */
function buildOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
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
    subtotal: 1000,
    discountTotal: 0,
    total: 1000,
    notes: null,
    cancellationReason: null,
    items: [
      {
        id: 1,
        productId: 100,
        productName: 'Aceite',
        productBarcode: '7501',
        quantity: 1,
        unitPrice: 500,
        discountAmount: 0,
        subtotalAmount: 500,
      } as OrderItem,
      {
        id: 2,
        productId: 101,
        productName: 'Yerba',
        productBarcode: '7790',
        quantity: 1,
        unitPrice: 500,
        discountAmount: 0,
        subtotalAmount: 500,
      } as OrderItem,
    ],
    payments: [
      {
        id: 1,
        provider: 'MANUAL',
        method: 'CASH',
        status: 'APPROVED',
        amount: 1000,
        approvedAt: null,
        createdAt: '',
      } as PaymentSummary,
    ],
    paidAt: null,
    preparedAt: null,
    readyAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

/** Unit tests for {@link PosCheckoutResultDialogComponent}. */
describe('PosCheckoutResultDialogComponent', () => {
  let fixture: ComponentFixture<PosCheckoutResultDialogComponent>;
  let component: PosCheckoutResultDialogComponent;

  async function createComponent(order = buildOrder()): Promise<void> {
    TestBed.configureTestingModule({
      imports: [PosCheckoutResultDialogComponent],
      providers: [provideNoopAnimations()],
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(PosCheckoutResultDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  }

  it('should create the component', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('renders the order number, total and payment method', async () => {
    await createComponent();
    // PrimeNG Dialog with appendTo='body' renders into the document body, not the
    // component host. Look in document.body to find the modal content.
    const text = document.body.textContent ?? '';
    expect(text).toContain('PS-20260630-000001');
    expect(text).toContain('Efectivo');
    expect(text).toContain('POS');
    // Total formatted as es-AR currency
    expect(text).toContain('1.000,00');
  });

  it('emits newSale when "Nueva venta" is clicked', async () => {
    await createComponent();
    let emitted = 0;
    component.newSale.subscribe(() => emitted++);
    const btn = document.body.querySelector(
      '[data-testid="receipt-new-sale"]',
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(emitted).toBe(1);
  });

  it('truncates the items list to 5 with a +N indicator', async () => {
    const manyItems: OrderItem[] = Array.from(
      { length: 7 },
      (_, i) =>
        ({
          id: i + 1,
          productId: 100 + i,
          productName: 'Item ' + (i + 1),
          productBarcode: 'BC' + i,
          quantity: 1,
          unitPrice: 100,
          discountAmount: 0,
          subtotalAmount: 100,
        }) as OrderItem,
    );
    const order = buildOrder({ items: manyItems, total: 700 });
    await createComponent(order);

    const text = document.body.textContent ?? '';
    expect(text).toContain('Item 1');
    expect(text).toContain('Item 5');
    expect(text).not.toContain('Item 6');
    expect(text).toContain('+ 2 items mas');
  });
});
