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
  StockLotFormValue,
} from '@features/inventory/domain/inventory-page';
import { isStockLotFormValid } from '@features/inventory/domain/inventory-page';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppModal } from '@shared/components/app-modal/app-modal';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { FormSection } from '@shared/components/form-section/form-section';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppProductSelector } from '@features/catalog/public-api';

/** Presentational direct stock-lot form. The page owns requests and user feedback. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stock-lot-form',
  imports: [
    AppButton,
    AppControlField,
    AppDatePicker,
    AppFormField,
    AppInputNumber,
    AppModal,
    AppProductSelector,
    AppSelect,
    ErrorAlert,
    FormSection,
    FormsModule,
  ],
  templateUrl: './stock-lot-form.html',
  styleUrl: './stock-lot-form.css',
})
export class StockLotForm implements OnChanges {
  readonly visible = model(false);
  readonly branches = input<readonly InventoryBranchOption[]>([]);
  readonly initialBranchId = input<number | null>(null);
  readonly branchRestricted = input(false);
  readonly suggestions = input<ProductSummary[]>([]);
  readonly saving = input(false);
  readonly error = input('');

  readonly productSearch = output<string>();
  readonly submitted = output<StockLotFormValue>();

  readonly product = signal<ProductSummary | null>(null);
  readonly branchId = signal<number | null>(null);
  readonly quantity = signal<number | null>(null);
  readonly lotCode = signal('');
  readonly expirationDate = signal<Date | null>(null);
  readonly costPrice = signal<number | null>(null);
  private readonly validationError = signal('');

  readonly minDate = computed(() => new Date());
  readonly formError = computed(() => this.validationError() || this.error());
  readonly valid = computed(() => isStockLotFormValid(this.value()));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.reset();
    }
  }

  submit(): void {
    const value = this.value();
    if (!isStockLotFormValid(value)) {
      this.validationError.set('Completa todos los campos obligatorios.');
      return;
    }
    this.validationError.set('');
    this.submitted.emit(value);
  }

  private reset(): void {
    this.product.set(null);
    this.branchId.set(this.initialBranchId());
    this.quantity.set(null);
    this.lotCode.set('');
    this.expirationDate.set(null);
    this.costPrice.set(null);
    this.validationError.set('');
  }

  private value(): StockLotFormValue {
    return {
      product: this.product(),
      branchId: this.branchId(),
      quantity: this.quantity(),
      lotCode: this.lotCode(),
      expirationDate: this.expirationDate(),
      costPrice: this.costPrice(),
    };
  }
}
