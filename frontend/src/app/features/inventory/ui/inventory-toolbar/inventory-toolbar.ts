import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import type { InventoryBranchOption } from '@features/inventory/domain/inventory-page';
import { AppSearchBar } from '@shared/components/app-search-bar/app-search-bar';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppToggleSwitch } from '@shared/components/app-toggle-switch/app-toggle-switch';

/** Inventory summary filters, kept presentational and controlled by the page store. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inventory-toolbar',
  imports: [AppSearchBar, AppSelect, AppToggleSwitch],
  templateUrl: './inventory-toolbar.html',
  styleUrl: './inventory-toolbar.css',
})
export class InventoryToolbar {
  readonly search = input('');
  readonly branchId = input<number | null>(null);
  readonly expiringSoon = input(false);
  readonly branchOptions = input<readonly InventoryBranchOption[]>([]);

  readonly searchChanged = output<string>();
  readonly branchChanged = output<number | null>();
  readonly expiringSoonChanged = output<boolean>();
}
