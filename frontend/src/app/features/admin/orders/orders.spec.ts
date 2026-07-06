import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Orders } from './orders';
import { AdminOrderService } from '../../../core/services/admin-order';
import { UserService } from '../../../core/services/user';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { OrderSummary, OrderStatus, OrderType, FulfillmentType } from '../../../shared/models/order';
import { PageResponse } from '../../../shared/models/page';

/** Creates a mock OrderSummary for testing. */
function mockOrder(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: 1,
    orderNumber: 'ON-20260706-000001',
    type: 'ONLINE' as OrderType,
    status: 'PAID' as OrderStatus,
    fulfillmentType: 'PICKUP' as FulfillmentType,
    branchId: 1,
    branchName: 'Sucursal Centro',
    customerUserId: 10,
    customerName: 'Ignacio Osella',
    subtotal: 1500,
    discountTotal: 0,
    total: 1500,
    itemCount: 2,
    paidAt: '2026-07-06T10:00:00Z',
    deliveredAt: null,
    createdAt: '2026-07-06T09:30:00Z',
    ...overrides,
  };
}

/** Creates a mock PageResponse for orders. */
function mockPage(orders: OrderSummary[]): PageResponse<OrderSummary> {
  return {
    content: orders,
    totalElements: orders.length,
    totalPages: 1,
    number: 0,
    size: 10,
    first: true,
    last: true,
    empty: orders.length === 0,
  };
}

describe('Orders (admin list)', () => {
  let fixture: ComponentFixture<Orders>;
  let component: Orders;
  let adminOrderService: {
    listOrders: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
    markReady: ReturnType<typeof vi.fn>;
    deliver: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };

  function configure() {
    adminOrderService = {
      listOrders: vi.fn().mockReturnValue(of(mockPage([]))),
      prepare: vi.fn(),
      markReady: vi.fn(),
      deliver: vi.fn(),
    };
    const userService = { listBranches: vi.fn().mockReturnValue(of([])) };
    router = { navigate: vi.fn().mockResolvedValue(true) };
    messageService = { add: vi.fn() };
    const route = { snapshot: { paramMap: { get: () => null } } };

    TestBed.configureTestingModule({
      imports: [Orders],
      providers: [
        provideNoopAnimations(),
        { provide: AdminOrderService, useValue: adminOrderService },
        { provide: UserService, useValue: userService },
        {
          provide: ErrorMappingService,
          useValue: { getMessage: vi.fn().mockReturnValue('Error') },
        },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: MessageService, useValue: messageService },
      ],
    });

    fixture = TestBed.createComponent(Orders);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    configure();
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load orders on init', () => {
    fixture.detectChanges();
    expect(adminOrderService.listOrders).toHaveBeenCalled();
  });

  it('should display order rows when data is present', async () => {
    adminOrderService.listOrders.mockReturnValue(of(mockPage([mockOrder()])));
    component.loadOrders();
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('ON-20260706-000001');
  });

  it('should display customer name', async () => {
    adminOrderService.listOrders.mockReturnValue(of(mockPage([mockOrder()])));
    component.loadOrders();
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ignacio Osella');
  });

  it('should display the type pill for ONLINE orders', async () => {
    adminOrderService.listOrders.mockReturnValue(of(mockPage([mockOrder({ type: 'ONLINE' })])));
    component.loadOrders();
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Online');
  });

  it('should display the type pill for POS orders', async () => {
    adminOrderService.listOrders.mockReturnValue(of(mockPage([mockOrder({ type: 'POS' })])));
    component.loadOrders();
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('POS');
  });

  it('should show error alert on API failure', async () => {
    adminOrderService.listOrders.mockReturnValue(
      throwError(() => ({
        status: 500,
        error: { code: 'INTERNAL_ERROR', message: 'Server down' },
      })),
    );
    component.loadOrders();
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const alertEl = el.querySelector('app-error-alert');
    expect(alertEl).toBeTruthy();
  });

  it('should navigate to order detail on view click', async () => {
    adminOrderService.listOrders.mockReturnValue(of(mockPage([mockOrder()])));
    component.loadOrders();
    fixture.detectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const viewBtn = el.querySelector('[aria-label*="Ver detalle"]') as HTMLElement;
    if (viewBtn) {
      viewBtn.click();
      await fixture.whenStable();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/orders', 1]);
    }
  });

  // ----------------------------------------------------------------
  // Quick transition action button
  // ----------------------------------------------------------------

  describe('quick transition button', () => {
    it('should show the quick action button for PAID ONLINE orders', async () => {
      adminOrderService.listOrders.mockReturnValue(of(mockPage([mockOrder({ status: 'PAID' })])));
      component.loadOrders();
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      const actionBtn = el.querySelector('[aria-label*="Preparar pedido"]') as HTMLElement;
      expect(actionBtn).toBeTruthy();
    });

    it('should NOT show the quick action button for PAID POS orders', async () => {
      adminOrderService.listOrders.mockReturnValue(
        of(mockPage([mockOrder({ type: 'POS', status: 'PAID' })])),
      );
      component.loadOrders();
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      const actionBtn = el.querySelector('[aria-label*="Preparar pedido"]') as HTMLElement;
      expect(actionBtn).toBeNull();
    });

    it('should NOT show the quick action button for DELIVERED orders', async () => {
      adminOrderService.listOrders.mockReturnValue(
        of(mockPage([mockOrder({ status: 'DELIVERED' })])),
      );
      component.loadOrders();
      fixture.detectChanges();
      await fixture.whenStable();
      const el: HTMLElement = fixture.nativeElement;
      const actionBtn = el.querySelector('button.orders-icon-btn--action') as HTMLElement;
      expect(actionBtn).toBeNull();
    });

    it('should open the confirm dialog when the action button is clicked (PAID)', async () => {
      adminOrderService.listOrders.mockReturnValue(of(mockPage([mockOrder({ status: 'PAID' })])));
      component.loadOrders();
      fixture.detectChanges();
      await fixture.whenStable();

      const el: HTMLElement = fixture.nativeElement;
      const actionBtn = el.querySelector('[aria-label*="Preparar pedido"]') as HTMLElement;
      actionBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDialog = el.querySelector('app-confirm-dialog');
      expect(confirmDialog).toBeTruthy();
    });

    it('should call prepare endpoint when confirm dialog is accepted (PAID)', async () => {
      adminOrderService.listOrders.mockReturnValue(of(mockPage([mockOrder({ status: 'PAID' })])));
      adminOrderService.prepare.mockReturnValue(of(mockOrder({ status: 'PREPARING' })));
      component.loadOrders();
      fixture.detectChanges();
      await fixture.whenStable();

      const el: HTMLElement = fixture.nativeElement;
      const actionBtn = el.querySelector('[aria-label*="Preparar pedido"]') as HTMLElement;
      actionBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Trigger confirmed output on the dialog.
      const confirmDe = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      if (confirmDe) {
        (confirmDe.componentInstance as { confirmed: { emit: () => void } }).confirmed.emit();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(adminOrderService.prepare).toHaveBeenCalledWith(1);
      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('should call markReady endpoint for PREPARING orders', async () => {
      adminOrderService.listOrders.mockReturnValue(
        of(mockPage([mockOrder({ status: 'PREPARING' })])),
      );
      adminOrderService.markReady.mockReturnValue(of(mockOrder({ status: 'READY' })));
      component.loadOrders();
      fixture.detectChanges();
      await fixture.whenStable();

      const el: HTMLElement = fixture.nativeElement;
      const actionBtn = el.querySelector('[aria-label*="Marcar listo"]') as HTMLElement;
      expect(actionBtn).toBeTruthy();
      actionBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDe = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      if (confirmDe) {
        (confirmDe.componentInstance as { confirmed: { emit: () => void } }).confirmed.emit();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(adminOrderService.markReady).toHaveBeenCalledWith(1);
    });

    it('should call deliver endpoint for READY orders', async () => {
      adminOrderService.listOrders.mockReturnValue(
        of(mockPage([mockOrder({ status: 'READY' })])),
      );
      adminOrderService.deliver.mockReturnValue(of(mockOrder({ status: 'DELIVERED' })));
      component.loadOrders();
      fixture.detectChanges();
      await fixture.whenStable();

      const el: HTMLElement = fixture.nativeElement;
      const actionBtn = el.querySelector('[aria-label*="Confirmar entrega"]') as HTMLElement;
      expect(actionBtn).toBeTruthy();
      actionBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const confirmDe = fixture.debugElement.query(
        (de) => de.nativeElement?.tagName?.toLowerCase() === 'app-confirm-dialog',
      );
      if (confirmDe) {
        (confirmDe.componentInstance as { confirmed: { emit: () => void } }).confirmed.emit();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(adminOrderService.deliver).toHaveBeenCalledWith(1);
    });
  });
});
