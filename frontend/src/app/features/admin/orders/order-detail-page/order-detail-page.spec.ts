import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OrderDetailPage } from './order-detail-page';
import { AdminOrderService } from '../../../../core/services/admin-order';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import {
  OrderDetail,
  OrderStatus,
  OrderType,
  FulfillmentType,
  OrderItem,
  PaymentSummary,
} from '../../../../shared/models/order';

// ----------------------------------------------------------------
// Test data factories
// ----------------------------------------------------------------

function mockOrderDetail(status: OrderStatus, overrides: Partial<OrderDetail> = {}): OrderDetail {
  const now = '2026-07-06T12:00:00Z';
  const paidAt = status === 'PENDING_PAYMENT' ? null : '2026-07-06T10:00:00Z';
  const preparedAt =
    status === 'PREPARING' || status === 'READY' || status === 'DELIVERED'
      ? '2026-07-06T10:30:00Z'
      : null;
  const readyAt = status === 'READY' || status === 'DELIVERED' ? '2026-07-06T11:00:00Z' : null;
  const deliveredAt = status === 'DELIVERED' ? '2026-07-06T12:00:00Z' : null;
  return {
    id: 1,
    orderNumber: 'ON-20260706-000001',
    type: 'ONLINE' as OrderType,
    status,
    fulfillmentType: 'PICKUP' as FulfillmentType,
    branchId: 1,
    branchName: 'Sucursal Centro',
    customerUserId: 10,
    customerName: 'Ignacio Osella',
    customerEmail: 'ignacio@example.com',
    customerPhone: null,
    subtotal: 1500,
    discountTotal: 0,
    total: 1500,
    notes: null,
    cancellationReason: null,
    items: mockItems(),
    payments: mockPayments(),
    paidAt,
    preparedAt,
    readyAt,
    deliveredAt,
    cancelledAt: null,
    createdAt: '2026-07-06T09:30:00Z',
    updatedAt: now,
    ...overrides,
  };
}

function mockItems(): OrderItem[] {
  return [
    { id: 1, productId: 100, productName: 'Yerba Mate Organica', productBarcode: '1234567890123', quantity: 2, unitPrice: 500, discountAmount: 0, subtotalAmount: 1000 },
    { id: 2, productId: 101, productName: 'Granola Artesanal', productBarcode: null, quantity: 1, unitPrice: 500, discountAmount: 0, subtotalAmount: 500 },
  ];
}

function mockPayments(): PaymentSummary[] {
  return [
    { id: 1, provider: 'MERCADO_PAGO', method: 'CHECKOUT_PRO', status: 'APPROVED', amount: 1500, approvedAt: '2026-07-06T10:00:00Z', createdAt: '2026-07-06T09:31:00Z' },
  ];
}

// ----------------------------------------------------------------
// Test suite
// ----------------------------------------------------------------

describe('OrderDetailPage', () => {
  let fixture: ComponentFixture<OrderDetailPage>;
  let adminOrderService: {
    getOrder: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
    markReady: ReturnType<typeof vi.fn>;
    deliver: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };

  function configure(params: Record<string, string> = { id: '1' }) {
    adminOrderService = {
      getOrder: vi.fn(),
      prepare: vi.fn(),
      markReady: vi.fn(),
      deliver: vi.fn(),
      cancel: vi.fn(),
    };
    messageService = { add: vi.fn() };
    const route = { snapshot: { paramMap: { get: (key: string) => params[key] ?? null } } };

    TestBed.configureTestingModule({
      imports: [OrderDetailPage],
      providers: [
        provideNoopAnimations(),
        { provide: AdminOrderService, useValue: adminOrderService },
        { provide: ErrorMappingService, useValue: { getMessage: vi.fn().mockReturnValue('Error') } },
        { provide: ActivatedRoute, useValue: route },
        { provide: MessageService, useValue: messageService },
      ],
    });

    fixture = TestBed.createComponent(OrderDetailPage);
  }

  // ----------------------------------------------------------------
  // Data loading
  // ----------------------------------------------------------------

  describe('data loading', () => {
    it('should load order detail on init', () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      expect(adminOrderService.getOrder).toHaveBeenCalledWith(1);
    });

    it('should display order number when loaded', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('ON-20260706-000001');
    });

    it('should show error when order not found', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(
        throwError(() => ({ status: 404, error: { code: 'ORDER_NOT_FOUND', message: 'Not found' } })),
      );
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      const alert = el.querySelector('app-error-alert');
      expect(alert).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  // Transition button visibility
  // ----------------------------------------------------------------

  describe('transition button visibility', () => {
    it('should show "Preparar pedido" button when status is PAID', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Preparar pedido');
    });

    it('should show "Marcar como listo" button when status is PREPARING', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PREPARING')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Marcar como listo');
    });

    it('should show "Confirmar entrega" button when status is READY', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('READY')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Confirmar entrega');
    });

    it('should show completion message when status is DELIVERED', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('DELIVERED')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Pedido entregado');
    });

    it('should not show action buttons for PENDING_PAYMENT', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PENDING_PAYMENT')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).not.toContain('Preparar pedido');
      expect(el.textContent).not.toContain('Marcar como listo');
    });

    it('should not show action buttons for POS orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(
        of(mockOrderDetail('PAID', { type: 'POS' as OrderType })),
      );
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).not.toContain('Preparar pedido');
    });
  });

  // ----------------------------------------------------------------
  // Transition execution — end-to-end click verification
  // ----------------------------------------------------------------

  describe('transition execution', () => {
    /** Locates the primary action button by its label text. */
    function findPrimaryAction(label: string): HTMLButtonElement | null {
      const el: HTMLElement = fixture.nativeElement;
      const btns = Array.from(el.querySelectorAll('button.order-detail-primary-action'));
      return (btns.find((b) => b.textContent?.includes(label)) as HTMLButtonElement) ?? null;
    }

    it('should expose a clickable primary action button on PAID orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      await fixture.whenStable();
      const btn = findPrimaryAction('Preparar pedido');
      expect(btn).toBeTruthy();
      expect(btn?.disabled).toBe(false);
    });

    it('should open confirm dialog when primary action is clicked (PAID)', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      adminOrderService.prepare.mockReturnValue(of(mockOrderDetail('PREPARING')));
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = findPrimaryAction('Preparar pedido');
      expect(btn).toBeTruthy();
      btn?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Confirm dialog should now be visible with the right title.
      const confirmDialog = fixture.nativeElement.querySelector('app-confirm-dialog');
      expect(confirmDialog).toBeTruthy();
    });

    it('should call prepare endpoint when confirm dialog is confirmed (PAID)', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      adminOrderService.prepare.mockReturnValue(of(mockOrderDetail('PREPARING')));
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = findPrimaryAction('Preparar pedido');
      btn?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Trigger the (confirmed) output on the confirm dialog.
      const confirmDialog = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      if (confirmDialog) {
        const cmp = confirmDialog.componentInstance as { confirmed: { emit: () => void } };
        cmp.confirmed.emit();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(adminOrderService.prepare).toHaveBeenCalledWith(1);
    });

    it('should call markReady endpoint for PREPARING orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PREPARING')));
      adminOrderService.markReady.mockReturnValue(of(mockOrderDetail('READY')));
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = findPrimaryAction('Marcar como listo');
      expect(btn).toBeTruthy();
      btn?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDialog = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      if (confirmDialog) {
        (confirmDialog.componentInstance as { confirmed: { emit: () => void } }).confirmed.emit();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(adminOrderService.markReady).toHaveBeenCalledWith(1);
    });

    it('should call deliver endpoint for READY orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('READY')));
      adminOrderService.deliver.mockReturnValue(of(mockOrderDetail('DELIVERED')));
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = findPrimaryAction('Confirmar entrega');
      expect(btn).toBeTruthy();
      btn?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDialog = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      if (confirmDialog) {
        (confirmDialog.componentInstance as { confirmed: { emit: () => void } }).confirmed.emit();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(adminOrderService.deliver).toHaveBeenCalledWith(1);
    });

    it('should show success toast after successful transition', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      adminOrderService.prepare.mockReturnValue(of(mockOrderDetail('PREPARING')));
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = findPrimaryAction('Preparar pedido');
      btn?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDialog = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      if (confirmDialog) {
        (confirmDialog.componentInstance as { confirmed: { emit: () => void } }).confirmed.emit();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('should show error toast on transition failure', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      adminOrderService.prepare.mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { code: 'ORDER_INVALID_STATE', message: 'Cannot transition' },
        })),
      );
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = findPrimaryAction('Preparar pedido');
      btn?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDialog = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      if (confirmDialog) {
        (confirmDialog.componentInstance as { confirmed: { emit: () => void } }).confirmed.emit();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });
  });

  // ----------------------------------------------------------------
  // Timeline
  // ----------------------------------------------------------------

  describe('timeline', () => {
    it('should render timeline with all key steps', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Pedido creado');
      expect(el.textContent).toContain('Pago confirmado');
    });

    it('should mark completed steps with check icon', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('DELIVERED')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      const completedDots = el.querySelectorAll('.order-timeline__step--completed .pi-check');
      expect(completedDots.length).toBeGreaterThanOrEqual(3);
    });

    it('should mark the current step as active', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PREPARING')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      const activeDots = el.querySelectorAll('.order-timeline__step--active');
      expect(activeDots.length).toBe(1);
    });

    it('should show cancelled state with red dot and times icon', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(
        of(
          mockOrderDetail('CANCELLED', {
            cancelledAt: '2026-07-06T11:00:00Z',
            cancellationReason: 'Cliente desiste',
          }),
        ),
      );
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      const cancelledDots = el.querySelectorAll('.order-timeline__step--cancelled');
      expect(cancelledDots.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------------------------------
  // Order items and payments
  // ----------------------------------------------------------------

  describe('order items and payments', () => {
    it('should display item names', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Yerba Mate Organica');
      expect(el.textContent).toContain('Granola Artesanal');
    });

    it('should display payment info', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Mercado Pago');
    });

    it('should display order total in the totals section', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      // The total is rendered as $ 1.500 by the currency pipe
      expect(el.textContent).toContain('1.500');
    });
  });

  // ----------------------------------------------------------------
  // Cancellation flow
  // ----------------------------------------------------------------

  describe('cancellation flow', () => {
    /** Returns the destructive cancel button in the order detail template. */
    function findCancelButton(): HTMLButtonElement | null {
      const el: HTMLElement = fixture.nativeElement;
      return el.querySelector('button.order-detail-cancel-action');
    }

    it('shows the cancel button for PAID ONLINE orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(findCancelButton()).toBeTruthy();
    });

    it('shows the cancel button for PREPARING orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PREPARING')));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(findCancelButton()).toBeTruthy();
    });

    it('shows the cancel button for READY orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('READY')));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(findCancelButton()).toBeTruthy();
    });

    it('does NOT show the cancel button for DELIVERED orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('DELIVERED')));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(findCancelButton()).toBeNull();
    });

    it('does NOT show the cancel button for already CANCELLED orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('CANCELLED')));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(findCancelButton()).toBeNull();
    });

    it('shows the cancel button for POS PAID orders', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(
        of(mockOrderDetail('PAID', { type: 'POS' as OrderType })),
      );
      fixture.detectChanges();
      await fixture.whenStable();
      expect(findCancelButton()).toBeTruthy();
    });

    it('calls adminOrderService.cancel and updates the order when confirmed', async () => {
      configure();
      const cancelledOrder = mockOrderDetail('CANCELLED', {
        cancellationReason: 'Cliente desiste del pedido',
        cancelledAt: '2026-07-06T12:00:00Z',
      });
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      adminOrderService.cancel.mockReturnValue(of(cancelledOrder));
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = findCancelButton();
      expect(btn).toBeTruthy();
      btn?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDialog = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      const cmp = confirmDialog.componentInstance as {
        reason: { set: (v: string) => void };
        confirmed: { emit: () => void };
      };
      cmp.reason.set('Cliente desiste del pedido');
      cmp.confirmed.emit();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(adminOrderService.cancel).toHaveBeenCalledWith(1, {
        reason: 'Cliente desiste del pedido',
      });
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('shows an error toast on cancel failure', async () => {
      configure();
      adminOrderService.getOrder.mockReturnValue(of(mockOrderDetail('PAID')));
      adminOrderService.cancel.mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { code: 'ORDER_INVALID_STATE', message: 'Cannot transition' },
        })),
      );
      fixture.detectChanges();
      await fixture.whenStable();

      const btn = findCancelButton();
      btn?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDialog = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      const cmp = confirmDialog.componentInstance as {
        reason: { set: (v: string) => void };
        confirmed: { emit: () => void };
      };
      cmp.reason.set('Prueba');
      cmp.confirmed.emit();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error' }),
      );
    });
  });
});
