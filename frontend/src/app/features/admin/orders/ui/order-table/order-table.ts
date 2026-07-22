import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { OrderSummary } from '@features/orders/domain/order';
import {
  ORDER_STATUS_BADGES,
  canCancelOrder,
  orderTransitionForStatus,
  type OrderTransitionAction,
} from '@features/orders/public-api';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '@core/pipes/short-date-ar.pipe';
import { StatusBadge } from '@shared/components/status-badge/status-badge';

export interface OrderQuickActionEvent {
  readonly order: OrderSummary;
  readonly action: OrderTransitionAction;
}

@Component({
  selector: 'app-order-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppDataTable, CurrencyArPipe, ShortDateArPipe, StatusBadge],
  templateUrl: './order-table.html',
  styleUrl: './order-table.css',
})
export class OrderTable {
  readonly orders = input.required<OrderSummary[]>();
  readonly loading = input(false);
  readonly totalRecords = input(0);
  readonly first = input(0);
  readonly pageSize = input(10);
  readonly sortField = input<string | undefined>(undefined);
  readonly sortOrder = input<number | undefined>(undefined);

  readonly pageChange = output<{ first: number; rows: number }>();
  readonly sortChange = output<{ field: string; order: number }>();
  readonly view = output<number>();
  readonly quickAction = output<OrderQuickActionEvent>();
  readonly cancel = output<OrderSummary>();

  readonly columns: ColumnDef[] = [
    { field: 'orderNumber', header: 'Pedido', sortable: true },
    { field: 'customerName', header: 'Cliente', sortable: true },
    { field: 'status', header: 'Estado', sortable: true, width: '13rem' },
    { field: 'branchName', header: 'Sucursal', sortable: true },
    { field: 'total', header: 'Total', sortable: true, width: '8rem' },
    { field: 'createdAt', header: 'Fecha', sortable: true, width: '10rem' },
    { field: 'actions', header: '', sortable: false, width: '11rem' },
  ];

  readonly statusBadges = ORDER_STATUS_BADGES;

  typeLabel(type: OrderSummary['type']): string {
    return type === 'ONLINE' ? 'Online' : 'POS';
  }

  quickActionFor(order: OrderSummary): OrderTransitionAction | null {
    return order.type === 'ONLINE' ? orderTransitionForStatus(order.status) : null;
  }

  canCancel(order: OrderSummary): boolean {
    return canCancelOrder(order.status);
  }

  emitQuickAction(order: OrderSummary, action: OrderTransitionAction): void {
    this.quickAction.emit({ order, action });
  }
}
