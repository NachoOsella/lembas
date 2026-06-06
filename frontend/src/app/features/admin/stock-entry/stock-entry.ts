import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { InventoryService } from '../../../core/services/inventory';
import { ProductService } from '../../../core/services/product';
import { UserService } from '../../../core/services/user';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { ProductSummary } from '../../../shared/models/product';
import { Branch } from '../../../shared/models/user';
import { StockLotDto } from '../../../shared/models/inventory';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppProductSelector } from '../../../shared/components/app-product-selector/app-product-selector';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { FormSection } from '../../../shared/components/form-section/form-section';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

/** Admin form for registering new product stock lots and purchase-entry movements. */
@Component({
  selector: 'app-stock-entry',
  imports: [
    AppButton,
    AppPageHeader,
    AppProductSelector,
    DatePicker,
    ErrorAlert,
    FormSection,
    FormsModule,
    InputNumber,
    InputText,
    Select,
  ],
  templateUrl: './stock-entry.html',
  styleUrl: './stock-entry.css',
})
export class StockEntry {
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly userService = inject(UserService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);

  protected readonly loadingBranches = signal(false);
  protected readonly searchingProducts = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly branches = signal<Branch[]>([]);
  protected readonly productSuggestions = signal<ProductSummary[]>([]);
  protected readonly selectedProduct = signal<ProductSummary | null>(null);
  protected readonly productSearch = signal('');
  protected readonly branchId = signal<number | null>(null);
  protected readonly quantity = signal<number | null>(null);
  protected readonly lotCode = signal('');
  protected readonly expirationDate = signal<Date | null>(null);
  protected readonly costPrice = signal<number | null>(null);
  protected readonly createdLot = signal<StockLotDto | null>(null);

  protected readonly branchOptions = computed<Option<number>[]>(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );
  protected readonly minExpirationDate = computed(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  protected readonly productInvalid = computed(() => this.submitted() && !this.selectedProduct());
  protected readonly branchInvalid = computed(() => this.submitted() && !this.branchId());
  protected readonly quantityInvalid = computed(
    () => this.submitted() && (this.quantity() === null || Number(this.quantity()) <= 0),
  );
  protected readonly expirationInvalid = computed(() => {
    const expiration = this.expirationDate();
    return this.submitted() && !!expiration && expiration < this.minExpirationDate();
  });
  protected readonly formValid = computed(
    () =>
      !!this.selectedProduct() &&
      !!this.branchId() &&
      this.quantity() !== null &&
      Number(this.quantity()) > 0 &&
      !this.expirationInvalid(),
  );

  constructor() {
    this.loadBranches();
  }

  /** Searches admin products by name or barcode for the product selector. */
  protected searchProducts(query: string): void {
    this.productSearch.set(query);
    if (query.length < 2) {
      this.productSuggestions.set([]);
      return;
    }

    this.searchingProducts.set(true);
    this.productService
      .listAdminProducts({ search: query, page: 0, size: 10, sort: 'name,asc' })
      .subscribe({
        next: (page) => {
          this.productSuggestions.set(page.content);
          this.searchingProducts.set(false);
        },
        error: () => {
          this.productSuggestions.set([]);
          this.searchingProducts.set(false);
        },
      });
  }

  /** Submits a valid stock entry to the backend. */
  protected save(): void {
    this.submitted.set(true);
    this.error.set('');
    this.createdLot.set(null);
    if (!this.formValid()) {
      return;
    }

    const product = this.selectedProduct();
    const branchId = this.branchId();
    const quantity = this.quantity();
    if (!product || !branchId || quantity === null) {
      return;
    }

    this.submitting.set(true);
    this.inventoryService
      .createPurchaseReceipt({
        productId: product.id,
        branchId,
        quantity,
        lotCode: this.lotCode().trim() || null,
        expirationDate: this.formatDate(this.expirationDate()),
        unitCost: this.costPrice(),
      })
      .subscribe({
        next: (receipt) => {
          const lot = receipt.stockLot;
          this.submitting.set(false);
          this.createdLot.set(lot);
          this.messageService.add({
            severity: 'success',
            summary: 'Stock actualizado',
            detail: `${lot.productName} ahora tiene ${receipt.totalAvailableForProductBranch ?? lot.quantityAvailable} unidades disponibles.`,
            life: 3000,
          });
          this.resetVariableFields();
        },
        error: (error) => {
          this.submitting.set(false);
          this.error.set(this.messageForError(error));
        },
      });
  }

  /** Loads active branches for the branch selector. */
  private loadBranches(): void {
    this.loadingBranches.set(true);
    this.userService.listBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        if (branches.length === 1) {
          this.branchId.set(branches[0].id);
        }
        this.loadingBranches.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar las sucursales.');
        this.loadingBranches.set(false);
      },
    });
  }

  /** Converts a Date to the backend LocalDate format. */
  private formatDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Clears fields that vary per incoming lot after a successful entry. */
  private resetVariableFields(): void {
    this.submitted.set(false);
    this.quantity.set(null);
    this.lotCode.set('');
    this.expirationDate.set(null);
    this.costPrice.set(null);
  }

  /** Maps backend ApiError codes to user-facing copy. */
  private messageForError(error: unknown): string {
    const apiError = getApiError(error);
    if (!apiError) {
      return 'No pudimos registrar el ingreso de stock.';
    }
    if (apiError.code === 'VALIDATION_ERROR') {
      return this.errorMapping.formatValidationErrors(apiError, this.fieldLabel);
    }
    return this.errorMapping.getMessage(apiError.code, apiError.message);
  }

  /** Translates backend validation field names to form labels. */
  private fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      productId: 'Producto',
      branchId: 'Sucursal',
      quantity: 'Cantidad',
      lotCode: 'Codigo de lote',
      expirationDate: 'Vencimiento',
      costPrice: 'Costo',
    };
    return labels[field] ?? field;
  }
}
