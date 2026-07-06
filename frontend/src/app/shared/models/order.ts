/** Order lifecycle states. See docs/02-domain/order-rules.md. */
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED'
  | 'STOCK_CONFLICT';

/** Sales channel discriminator for the unified orders table. */
export type OrderType = 'ONLINE' | 'POS';

/** Pickup / delivery mode. MVP only supports PICKUP. */
export type FulfillmentType = 'PICKUP';

// ----------------------------------------------------------------
// Order list row (matching backend OrderSummaryDto)
// ----------------------------------------------------------------
export interface OrderSummary {
  readonly id: number;
  readonly orderNumber: string;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly fulfillmentType: FulfillmentType;
  readonly branchId: number;
  readonly branchName: string;
  readonly customerUserId: number;
  readonly customerName: string;
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly total: number;
  readonly itemCount: number;
  readonly paidAt: string | null;
  readonly deliveredAt: string | null;
  readonly createdAt: string;
}

// ----------------------------------------------------------------
// Order line item (matching backend OrderItemDto)
// ----------------------------------------------------------------
export interface OrderItem {
  readonly id: number;
  readonly productId: number;
  readonly productName: string;
  readonly productBarcode: string | null;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountAmount: number;
  readonly subtotalAmount: number;
}

// ----------------------------------------------------------------
// Payment status types
// ----------------------------------------------------------------
export type PaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'IN_PROCESS';

export type PaymentProvider = 'MERCADO_PAGO' | 'MANUAL';

export type PaymentMethod =
  | 'CHECKOUT_PRO'
  | 'CASH'
  | 'QR'
  | 'TRANSFER'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'OTHER';

/** Lightweight payment row included in order detail (matching backend PaymentSummaryDto). */
export interface PaymentSummary {
  readonly id: number;
  readonly provider: PaymentProvider;
  readonly method: PaymentMethod;
  readonly status: PaymentStatus;
  readonly amount: number;
  readonly approvedAt: string | null;
  readonly createdAt: string;
}

// ----------------------------------------------------------------
// Full order detail (matching backend OrderDetailDto)
// ----------------------------------------------------------------
export interface OrderDetail {
  readonly id: number;
  readonly orderNumber: string;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly fulfillmentType: FulfillmentType;
  readonly branchId: number;
  readonly branchName: string;
  readonly customerUserId: number;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly customerPhone: string | null;
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly total: number;
  readonly notes: string | null;
  readonly cancellationReason: string | null;
  readonly items: OrderItem[];
  readonly payments: PaymentSummary[];
  readonly paidAt: string | null;
  readonly preparedAt: string | null;
  readonly readyAt: string | null;
  readonly deliveredAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ----------------------------------------------------------------
// Status display helpers
// ----------------------------------------------------------------

/** Human-readable label for each order status. */
export function orderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    PENDING_PAYMENT: 'Pendiente de pago',
    PAID: 'Pagado',
    PREPARING: 'Preparando',
    READY: 'Listo para retirar',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    PAYMENT_FAILED: 'Pago rechazado',
    STOCK_CONFLICT: 'Conflicto de stock',
  };
  return labels[status] ?? status;
}

/** PrimeNG severity for consistent badge colors across the app. */
export function orderStatusSeverity(
  status: OrderStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  const map: Record<OrderStatus, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
    PENDING_PAYMENT: 'info',
    PAID: 'success',
    PREPARING: 'info',
    READY: 'success',
    DELIVERED: 'secondary',
    CANCELLED: 'danger',
    PAYMENT_FAILED: 'warn',
    STOCK_CONFLICT: 'warn',
  };
  return map[status];
}

/** Human-readable label for each payment status. */
export function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reintegrado',
    EXPIRED: 'Vencido',
    IN_PROCESS: 'En proceso',
  };
  return labels[status] ?? status;
}

/** PrimeNG severity for payment status badges. */
export function paymentStatusSeverity(
  status: PaymentStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  const map: Record<PaymentStatus, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
    PENDING: 'info',
    APPROVED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'secondary',
    REFUNDED: 'warn',
    EXPIRED: 'secondary',
    IN_PROCESS: 'info',
  };
  return map[status];
}
