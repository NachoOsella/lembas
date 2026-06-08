import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';
import { Message } from 'primeng/message';
import { Router } from '@angular/router';

import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppControlField } from '../../../shared/components/app-control-field/app-control-field';
import { AppFormField } from '../../../shared/components/app-form-field/app-form-field';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppProductSelector } from '../../../shared/components/app-product-selector/app-product-selector';
import { AppSelect } from '../../../shared/components/app-select/app-select';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { InventoryService } from '../../../core/services/inventory';
import { ProductService } from '../../../core/services/product';
import { UserService } from '../../../core/services/user';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { ProductSummary } from '../../../shared/models/product';
import { Branch } from '../../../shared/models/user';

@Component({
  selector: 'app-stock-adjustment',
  imports: [
    FormsModule,
    InputNumber,
    AppButton,
    AppControlField,
    ErrorAlert,
    Message,
    AppFormField,
    AppPageHeader,
    AppProductSelector,
    AppSelect,
  ],
  templateUrl: './stock-adjustment.html',
  styleUrl: './stock-adjustment.css',
})
export class StockAdjustment {
  private readonly router = inject(Router);
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly userService = inject(UserService);
  private readonly errorMapping = inject(ErrorMappingService);

  readonly typeOptions = [
    { label: 'Ajuste manual', value: 'MANUAL_ADJUSTMENT' },
    { label: 'Consumo interno', value: 'INTERNAL_CONSUMPTION' },
    { label: 'Merma', value: 'WASTE' },
  ];

  readonly selectedProduct = signal<ProductSummary | null>(null);
  readonly selectedBranchId = signal<number | null>(null);
  readonly adjustmentType = signal<string>('MANUAL_ADJUSTMENT');
  readonly adjustmentQuantity = signal<number | null>(null);
  readonly adjustmentReason = signal<string>('');

  readonly productSuggestions = signal<ProductSummary[]>([]);
  readonly branchOptions = signal<{ label: string; value: number }[]>([]);
  readonly currentStockLabel = signal<string>('');
  readonly saving = signal(false);
  readonly error = signal<string>('');
  readonly successMessage = signal<string>('');

  constructor() {
    this.loadBranches();
  }

  private loadBranches(): void {
    this.userService.listBranches().subscribe({
      next: (branches: Branch[]) => {
        this.branchOptions.set(
          branches.map((b) => ({ label: b.name, value: b.id }))
        );
      },
      error: () => {
        this.error.set('No se pudieron cargar las sucursales');
      },
    });
  }

  searchProducts(query: string): void {
    if (query.length < 2) {
      this.productSuggestions.set([]);
      return;
    }
    this.productService.listAdminProducts({ search: query }).subscribe({
      next: (page) => this.productSuggestions.set(page.content),
      error: () => this.productSuggestions.set([]),
    });
  }

  onProductChange(product: ProductSummary | null): void {
    this.selectedProduct.set(product);
    this.updateCurrentStock();
  }

  onBranchChange(branchId: number | null): void {
    this.selectedBranchId.set(branchId);
    this.updateCurrentStock();
  }

  private updateCurrentStock(): void {
    const product = this.selectedProduct();
    const branchId = this.selectedBranchId();
    if (!product || !branchId) {
      this.currentStockLabel.set('');
      return;
    }
    this.inventoryService.listLots({
      productId: product.id,
      branchId,
      size: 1,
    }).subscribe({
      next: (page) => {
        const total = page.totalElements;
        this.currentStockLabel.set(
          `Stock actual: ${total} unidades de ${product.name}`
        );
      },
      error: () => {
        this.currentStockLabel.set('');
      },
    });
  }

  get canSubmit(): () => boolean {
    return () =>
      this.selectedProduct() !== null &&
      this.selectedBranchId() !== null &&
      this.adjustmentQuantity() !== null &&
      this.adjustmentQuantity()! > 0 &&
      this.adjustmentReason().trim().length > 0;
  }

  submit(): void {
    const product = this.selectedProduct();
    const branchId = this.selectedBranchId();
    const quantity = this.adjustmentQuantity();
    const reason = this.adjustmentReason().trim();
    const type = this.adjustmentType();

    if (!product || !branchId || !quantity || quantity <= 0 || !reason) {
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.successMessage.set('');

    const typeLabel = this.typeOptions.find((t) => t.value === type)?.label ?? type;
    const signedQuantity = type === 'MANUAL_ADJUSTMENT' ? quantity : -quantity;

    this.inventoryService.adjustStock({
      productId: product.id,
      branchId,
      quantity: signedQuantity,
      reason,
      type: type as 'MANUAL_ADJUSTMENT' | 'INTERNAL_CONSUMPTION' | 'WASTE',
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set(
          `${typeLabel} registrado: ${signedQuantity > 0 ? '+' : ''}${signedQuantity} unidades de ${product.name}`
        );
        this.resetForm();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(getApiError(err)?.message ?? 'Error al ejecutar el ajuste');
      },
    });
  }

  resetForm(): void {
    this.selectedProduct.set(null);
    this.selectedBranchId.set(null);
    this.adjustmentType.set('MANUAL_ADJUSTMENT');
    this.adjustmentQuantity.set(null);
    this.adjustmentReason.set('');
    this.currentStockLabel.set('');
    this.error.set('');
    this.successMessage.set('');
  }
}
