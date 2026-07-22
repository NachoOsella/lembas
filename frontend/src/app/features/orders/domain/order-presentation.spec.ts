import { describe, expect, it } from 'vitest';

import {
  buildCustomerOrderTimeline,
  canCancelOrder,
  orderTransitionForStatus,
  paymentMethodLabel,
} from './order-presentation';
import type { OrderDetail } from './order';

function detail(status: OrderDetail['status']): OrderDetail {
  return {
    id: 1,
    orderNumber: 'ON-001',
    type: 'ONLINE',
    status,
    fulfillmentType: 'PICKUP',
    branchId: 1,
    branchName: 'Centro',
    customerUserId: 1,
    customerName: 'Customer',
    customerEmail: 'customer@example.com',
    customerPhone: null,
    subtotal: 100,
    discountTotal: 0,
    total: 100,
    notes: null,
    cancellationReason: null,
    items: [],
    payments: [],
    paidAt: null,
    preparedAt: null,
    readyAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: '2026-06-12T00:00:00Z',
    updatedAt: '2026-06-12T00:00:00Z',
  };
}

describe('order presentation policies', () => {
  it('exposes only the valid preparation transition for each online status', () => {
    expect(orderTransitionForStatus('PAID')?.key).toBe('prepare');
    expect(orderTransitionForStatus('PREPARING')?.key).toBe('ready');
    expect(orderTransitionForStatus('READY')?.key).toBe('deliver');
    expect(orderTransitionForStatus('DELIVERED')).toBeNull();
  });

  it('allows cancellation only before terminal order states', () => {
    expect(canCancelOrder('PAID')).toBe(true);
    expect(canCancelOrder('DELIVERED')).toBe(false);
    expect(canCancelOrder('CANCELLED')).toBe(false);
  });

  it('renders exceptional customer timelines as a short, explicit flow', () => {
    const timeline = buildCustomerOrderTimeline(detail('PAYMENT_FAILED'));
    expect(timeline.map((step) => step.label)).toEqual(['Pedido creado', 'Pago rechazado']);
  });

  it('maps supported payment methods without exposing provider values', () => {
    expect(paymentMethodLabel('CHECKOUT_PRO')).toBe('Mercado Pago');
    expect(paymentMethodLabel('UNEXPECTED')).toBe('Otro');
  });
});
