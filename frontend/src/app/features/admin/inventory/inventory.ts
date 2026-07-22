import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '@core/services/auth';
import type { StockProductSummaryDto } from '@features/inventory/domain/inventory';
import type { InventoryBranchOption } from '@features/inventory/domain/inventory-page';
import { InventoryPageStore } from '@features/inventory/public-api';
import { InventoryTable } from '@features/inventory/public-api';
import { InventoryToolbar } from '@features/inventory/public-api';
import { StockAdjustmentForm } from '@features/inventory/public-api';
import { StockLotForm } from '@features/inventory/public-api';
import { UserService } from '@features/users/data-access/user';
import type { Branch } from '@features/users/domain/user';
import { AppButton } from '@shared/components/app-button/app-button';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';

/** Admin page showing aggregated product-branch stock. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inventory',
  imports: [
    AppButton,
    AppPageHeader,
    ErrorAlert,
    InventoryTable,
    InventoryToolbar,
    StockAdjustmentForm,
    StockLotForm,
  ],
  providers: [InventoryPageStore],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly store = inject(InventoryPageStore);
  private readonly branches = signal<Branch[]>([]);

  readonly branchOptions = computed<InventoryBranchOption[]>(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );
  readonly canManageInventory = computed(() => {
    const role = this.authService.getUserRole();
    return role === 'ADMIN' || role === 'MANAGER' || role === 'EMPLOYEE';
  });
  readonly isBranchRestricted = computed(() => this.authService.getUserRole() !== 'ADMIN');
  readonly assignedBranchId = computed(() =>
    this.isBranchRestricted() ? (this.authService.currentUser()?.branchId ?? null) : null,
  );

  constructor() {
    this.userService
      .listBranches()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (branches) => this.branches.set(branches),
        error: () => this.branches.set([]),
      });
    this.store.loadProducts();
  }

  openCreateLot(): void {
    this.store.openCreateLot();
  }

  viewLots(item: StockProductSummaryDto): void {
    this.router.navigate(['/admin/inventory/product', item.productId, 'lots'], {
      queryParams: {
        branchId: item.branchId,
        productName: item.productName,
        branchName: item.branchName,
      },
    });
  }

  navigateToReceipts(): void {
    this.router.navigate(['/admin/receipts']);
  }
}
