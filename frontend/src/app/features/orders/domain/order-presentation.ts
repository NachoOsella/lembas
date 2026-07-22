import type { SeverityPillTone } from '@shared/components/severity-pill/severity-pill';
import type { StatusBadgeConfig } from '@shared/components/status-badge/status-badge';

import type { OrderDetail, OrderStatus, OrderType, PaymentStatus } from './order';
import {
  orderStatusLabel,
  orderStatusSeverity,
  paymentStatusLabel,
  paymentStatusSeverity,
} from './order';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED',
  'PAYMENT_FAILED',
  'STOCK_CONFLICT',
];

export const ORDER_TYPES: readonly OrderType[] = ['ONLINE', 'POS'];

export type OrderTransitionKey = 'prepare' | 'ready' | 'deliver';

export interface OrderTransitionAction {
  readonly key: OrderTransitionKey;
  readonly label: string;
  readonly description: string;
  readonly confirmTitle: string;
  readonly confirmMessage: string;
  readonly icon: string;
  readonly destructive?: boolean;
  readonly requiresReason?: boolean;
}

export interface OrderCancelAction {
  readonly key: 'cancel';
  readonly label: string;
  readonly description: string;
  readonly confirmTitle: string;
  readonly confirmMessage: string;
  readonly icon: string;
  readonly destructive: true;
  readonly requiresReason: true;
}

export const CANCEL_ORDER_ACTION: OrderCancelAction = {
  key: 'cancel',
  label: 'Cancelar pedido',
  description: 'Anular y revertir stock',
  confirmTitle: 'Cancelar pedido',
  confirmMessage:
    'Esta accion no se puede deshacer. Si el pedido ya desconto stock, sera devuelto a los lotes originales y los pagos quedaran marcados como cancelados.',
  icon: 'pi pi-times-circle',
  destructive: true,
  requiresReason: true,
};

const PREPARE_ACTION: OrderTransitionAction = {
  key: 'prepare',
  label: 'Preparar pedido',
  description: 'Pasara a estado Preparando.',
  confirmTitle: 'Iniciar preparacion',
  confirmMessage:
    'El pedido pasara a estado Preparando. Los productos se comenzaran a reunir para el retiro.',
  icon: 'pi pi-play',
};

const READY_ACTION: OrderTransitionAction = {
  key: 'ready',
  label: 'Marcar como listo',
  description: 'El pedido quedara listo para retirar.',
  confirmTitle: 'Marcar como listo para retirar',
  confirmMessage:
    'El pedido quedara marcado como Listo para retirar. El cliente podra pasar por la sucursal.',
  icon: 'pi pi-check',
};

const DELIVER_ACTION: OrderTransitionAction = {
  key: 'deliver',
  label: 'Confirmar entrega',
  description: 'El cliente retiro el pedido en sucursal.',
  confirmTitle: 'Confirmar entrega al cliente',
  confirmMessage:
    'Confirmas que el cliente ya retiro el pedido en la sucursal? El pedido quedara como Entregado.',
  icon: 'pi pi-box',
};

export function orderTransitionForStatus(status: OrderStatus): OrderTransitionAction | null {
  switch (status) {
    case 'PAID':
      return PREPARE_ACTION;
    case 'PREPARING':
      return READY_ACTION;
    case 'READY':
      return DELIVER_ACTION;
    default:
      return null;
  }
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status !== 'DELIVERED' && status !== 'CANCELLED';
}

export const ORDER_STATUS_BADGES: Record<OrderStatus, StatusBadgeConfig> = {
  PENDING_PAYMENT: statusBadge('PENDING_PAYMENT'),
  PAID: statusBadge('PAID'),
  PREPARING: statusBadge('PREPARING'),
  READY: statusBadge('READY'),
  DELIVERED: statusBadge('DELIVERED'),
  CANCELLED: statusBadge('CANCELLED'),
  PAYMENT_FAILED: statusBadge('PAYMENT_FAILED'),
  STOCK_CONFLICT: statusBadge('STOCK_CONFLICT'),
};

export function paymentStatusBadges(): Record<PaymentStatus, StatusBadgeConfig> {
  return {
    PENDING: { label: paymentStatusLabel('PENDING'), tone: 'info' },
    APPROVED: { label: paymentStatusLabel('APPROVED'), tone: 'success' },
    REJECTED: { label: paymentStatusLabel('REJECTED'), tone: 'danger' },
    CANCELLED: { label: paymentStatusLabel('CANCELLED'), tone: 'neutral' },
    REFUNDED: { label: paymentStatusLabel('REFUNDED'), tone: 'warning' },
    EXPIRED: { label: paymentStatusLabel('EXPIRED'), tone: 'neutral' },
    IN_PROCESS: { label: paymentStatusLabel('IN_PROCESS'), tone: 'info' },
  };
}

function statusBadge(status: OrderStatus): StatusBadgeConfig {
  const severity = orderStatusSeverity(status);
  if (severity === 'secondary') return { label: orderStatusLabel(status), tone: 'neutral' };
  if (severity === 'warn') return { label: orderStatusLabel(status), tone: 'warning' };
  return { label: orderStatusLabel(status), tone: severity };
}

export interface AdminTimelineStep {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly timestamp: string | null;
  readonly state: 'completed' | 'active' | 'pending' | 'cancelled';
}

export function buildAdminOrderTimeline(order: OrderDetail): AdminTimelineStep[] {
  const isCancelled = order.status === 'CANCELLED';
  const hasPaid = order.paidAt !== null || isAfterStatus(order.status, 'PAID');
  const hasPreparing = order.preparedAt !== null || isAfterStatus(order.status, 'PREPARING');
  const hasReady = order.readyAt !== null || isAfterStatus(order.status, 'READY');
  const hasDelivered = order.deliveredAt !== null;

  const steps: AdminTimelineStep[] = [
    {
      key: 'created',
      label: 'Pedido creado',
      description: 'El cliente completo la orden.',
      timestamp: order.createdAt,
      state: 'completed',
    },
    {
      key: 'paid',
      label: 'Pago confirmado',
      description: 'Mercado Pago aprobo el cobro.',
      timestamp: order.paidAt,
      state: hasPaid ? 'completed' : 'pending',
    },
    {
      key: 'preparing',
      label: 'En preparacion',
      description: 'Reunimos los productos en la sucursal.',
      timestamp: order.preparedAt,
      state: hasPreparing ? 'completed' : order.status === 'PAID' ? 'active' : 'pending',
    },
    {
      key: 'ready',
      label: 'Listo para retirar',
      description: 'Avisamos al cliente para que pase a buscar.',
      timestamp: order.readyAt,
      state: hasReady ? 'completed' : order.status === 'PREPARING' ? 'active' : 'pending',
    },
    {
      key: 'delivered',
      label: 'Entregado',
      description: 'El cliente retiro el pedido en la sucursal.',
      timestamp: order.deliveredAt,
      state: hasDelivered ? 'completed' : order.status === 'READY' ? 'active' : 'pending',
    },
  ];

  if (isCancelled && order.cancelledAt) {
    steps.push({
      key: 'cancelled',
      label: 'Cancelado',
      description: order.cancellationReason ?? 'Pedido cancelado.',
      timestamp: order.cancelledAt,
      state: 'cancelled',
    });
  }

  return steps;
}

export interface CustomerTimelineStep {
  readonly label: string;
  readonly description: string;
  readonly date: string | null;
  readonly icon: string;
  readonly state: 'done' | 'current' | 'upcoming' | 'alert';
}

export function buildCustomerOrderTimeline(order: OrderDetail): CustomerTimelineStep[] {
  const normalFlow: CustomerTimelineStep[] = [
    customerStep(
      'Pedido creado',
      'Recibimos tu pedido y lo dejamos listo para avanzar.',
      order.createdAt,
      'done',
      'pi pi-receipt',
    ),
    customerStep(
      'Pago pendiente',
      'El pedido queda reservado para iniciar el pago cuando quieras.',
      null,
      order.status === 'PENDING_PAYMENT' ? 'current' : 'done',
      'pi pi-wallet',
    ),
    customerStep(
      'Pago confirmado',
      'Acreditamos el pago correctamente.',
      order.paidAt,
      order.status === 'PAID'
        ? 'current'
        : ['PREPARING', 'READY', 'DELIVERED'].includes(order.status)
          ? 'done'
          : 'upcoming',
      'pi pi-check-circle',
    ),
    customerStep(
      'Preparando',
      'Estamos armando tu pedido con criterio FEFO.',
      order.preparedAt,
      order.status === 'PREPARING'
        ? 'current'
        : ['READY', 'DELIVERED'].includes(order.status)
          ? 'done'
          : 'upcoming',
      'pi pi-box',
    ),
    customerStep(
      'Listo para retirar',
      `Te esperamos en la sucursal ${order.branchName}.`,
      order.readyAt,
      order.status === 'READY' ? 'current' : order.status === 'DELIVERED' ? 'done' : 'upcoming',
      'pi pi-map-marker',
    ),
    customerStep(
      'Entregado',
      'Pedido retirado en sucursal. Gracias por elegir Lembas.',
      order.deliveredAt,
      order.status === 'DELIVERED' ? 'current' : 'upcoming',
      'pi pi-shopping-bag',
    ),
  ];

  if (order.status === 'CANCELLED') {
    return [
      normalFlow[0],
      customerStep(
        'Cancelado',
        'El pedido fue cancelado y cualquier stock afectado se revierte.',
        order.cancelledAt,
        'alert',
        'pi pi-times-circle',
      ),
    ];
  }

  if (order.status === 'PAYMENT_FAILED') {
    return [
      normalFlow[0],
      customerStep(
        'Pago rechazado',
        'No se pudo confirmar el pago. Podés intentar nuevamente.',
        null,
        'alert',
        'pi pi-exclamation-triangle',
      ),
    ];
  }

  return normalFlow;
}

function customerStep(
  label: string,
  description: string,
  date: string | null,
  state: CustomerTimelineStep['state'],
  icon: string,
): CustomerTimelineStep {
  return { label, description, date, icon, state };
}

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CHECKOUT_PRO: 'Mercado Pago',
    CASH: 'Efectivo',
    QR: 'QR',
    TRANSFER: 'Transferencia',
    DEBIT_CARD: 'Debito',
    CREDIT_CARD: 'Credito',
    OTHER: 'Otro',
  };
  return labels[method] ?? 'Otro';
}

export function orderStatusTone(status: OrderStatus): SeverityPillTone {
  return severityToPillTone(orderStatusSeverity(status));
}

export function paymentStatusTone(status: PaymentStatus): SeverityPillTone {
  return severityToPillTone(paymentStatusSeverity(status));
}

function severityToPillTone(severity: string): SeverityPillTone {
  switch (severity) {
    case 'success':
      return 'success';
    case 'warn':
    case 'warning':
      return 'warn';
    case 'danger':
    case 'error':
      return 'danger';
    default:
      return 'neutral';
  }
}

const STATUS_ORDER: Record<OrderStatus, number> = {
  PENDING_PAYMENT: 0,
  PAYMENT_FAILED: 1,
  STOCK_CONFLICT: 2,
  PAID: 3,
  PREPARING: 4,
  READY: 5,
  DELIVERED: 6,
  CANCELLED: 7,
};

function isAfterStatus(current: OrderStatus, reference: OrderStatus): boolean {
  return STATUS_ORDER[current] > STATUS_ORDER[reference];
}
