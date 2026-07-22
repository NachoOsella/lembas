import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ProductSummary } from '@features/catalog/domain/product';
import type {
  InventoryBranchOption,
  StockAdjustmentFormValue,
  StockAdjustmentType,
} from '@features/inventory/domain/inventory-page';
import { isStockAdjustmentFormValid } from '@features/inventory/domain/inventory-page';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppModal } from '@shared/components/app-modal/app-modal';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { FormSection } from '@shared/components/form-section/form-section';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppProductSelector } from '@features/catalog/public-api';

const ADJUSTMENT_TYPES: readonly { readonly label: string; readonly value: StockAdjustmentType }[] =
  [
    { label: 'Ajuste manual', value: 'MANUAL_ADJUSTMENT' },
    { label: 'Consumo interno', value: 'INTERNAL_CONSUMPTION' },
    { label: 'Merma', value: 'WASTE' },
  ];

/** Presentational adjustment form with typed command and context-change outputs. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stock-adjustment-form',
  imports: [
    AppButton,
    AppControlField,
    AppFormField,
    AppInputNumber,
    AppModal,
    AppProductSelector,
    AppSelect,
    ErrorAlert,
    FormSection,
    FormsModule,
  ],
  templateUrl: './stock-adjustment-form.html',
  styleUrl: './stock-adjustment-form.css',
})
export class StockAdjustmentForm implements OnChanges {
  readonly visible = model(false);
  readonly branches = input<readonly InventoryBranchOption[]>([]);
  readonly initialProduct = input<ProductSummary | null>(null);
  readonly initialBranchId = input<number | null>(null);
  readonly branchRestricted = input(false);
  readonly suggestions = input<ProductSummary[]>([]);
  readonly stockLabel = input('');
  readonly saving = input(false);
  readonly error = input('');

  readonly productSearch = output<string>();
  readonly stockContextChanged = output<{
    readonly product: ProductSummary | null;
    readonly branchId: number | null;
  }>();
  readonly submitted = output<StockAdjustmentFormValue>();

  readonly product = signal<ProductSummary | null>(null);
  readonly branchId = signal<number | null>(null);
  readonly type = signal<StockAdjustmentType>('MANUAL_ADJUSTMENT');
  readonly quantity = signal<number | null>(null);
  readonly reason = signal('');
  readonly adjustmentTypes = ADJUSTMENT_TYPES;
  private readonly validationError = signal('');

  readonly formError = computed(() => this.validationError() || this.error());
  readonly valid = computed(() => isStockAdjustmentFormValid(this.value()));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.reset();
    }
  }

  setProduct(product: ProductSummary | null): void {
    this.product.set(product);
    this.emitStockContext();
  }

  setBranch(branchId: unknown): void {
    this.branchId.set(typeof branchId === 'number' ? branchId : null);
    this.emitStockContext();
  }

  setType(type: unknown): void {
    if (isStockAdjustmentType(type)) {
      this.type.set(type);
    }
  }

  submit(): void {
    const value = this.value();
    if (!isStockAdjustmentFormValid(value)) {
      this.validationError.set('Completa todos los campos obligatorios.');
      return;
    }
    this.validationError.set('');
    this.submitted.emit(value);
  }

  private reset(): void {
    this.product.set(this.initialProduct());
    this.branchId.set(this.initialBranchId());
    this.type.set('MANUAL_ADJUSTMENT');
    this.quantity.set(null);
    this.reason.set('');
    this.validationError.set('');
  }

  private emitStockContext(): void {
    this.stockContextChanged.emit({ product: this.product(), branchId: this.branchId() });
  }

  private value(): StockAdjustmentFormValue {
    return {
      product: this.product(),
      branchId: this.branchId(),
      type: this.type(),
      quantity: this.quantity(),
      reason: this.reason(),
    };
  }
}

function isStockAdjustmentType(value: unknown): value is StockAdjustmentType {
  return value === 'MANUAL_ADJUSTMENT' || value === 'INTERNAL_CONSUMPTION' || value === 'WASTE';
}
