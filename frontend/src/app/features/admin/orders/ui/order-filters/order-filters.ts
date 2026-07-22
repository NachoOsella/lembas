import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ORDER_STATUSES } from '@features/orders/public-api';
import type { OrderStatus, OrderType } from '@features/orders/domain/order';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppSelect } from '@shared/components/app-select/app-select';
import type { Branch } from '@features/users/domain/user';

interface SelectOption<T> {
  readonly label: string;
  readonly value: T | null;
}

@Component({
  selector: 'app-order-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppButton, AppDatePicker, AppInput, AppSelect],
  templateUrl: './order-filters.html',
  styleUrl: './order-filters.css',
})
export class OrderFilters {
  readonly status = input<OrderStatus | null>(null);
  readonly type = input<OrderType | null>(null);
  readonly branchId = input<number | null>(null);
  readonly from = input<Date | null>(null);
  readonly to = input<Date | null>(null);
  readonly search = input('');
  readonly branches = input<Branch[]>([]);
  readonly branchRestricted = input(false);

  readonly statusChange = output<OrderStatus | null>();
  readonly typeChange = output<OrderType | null>();
  readonly branchChange = output<number | null>();
  readonly fromChange = output<Date | null>();
  readonly toChange = output<Date | null>();
  readonly searchChange = output<string>();
  readonly reset = output<void>();

  readonly statusOptions: readonly SelectOption<OrderStatus>[] = [
    { label: 'Todos los estados', value: null },
    ...ORDER_STATUSES.map((status) => ({ label: this.statusLabel(status), value: status })),
  ];

  readonly typeOptions: readonly SelectOption<OrderType>[] = [
    { label: 'Todos los tipos', value: null },
    { label: 'Online', value: 'ONLINE' },
    { label: 'POS', value: 'POS' },
  ];

  statusValue(value: unknown): void {
    this.statusChange.emit(isOrderStatus(value) ? value : null);
  }

  typeValue(value: unknown): void {
    this.typeChange.emit(isOrderType(value) ? value : null);
  }

  branchValue(value: unknown): void {
    this.branchChange.emit(typeof value === 'number' ? value : null);
  }

  private statusLabel(status: OrderStatus): string {
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
    return labels[status];
  }
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && ORDER_STATUSES.some((status) => status === value);
}

function isOrderType(value: unknown): value is OrderType {
  return value === 'ONLINE' || value === 'POS';
}
