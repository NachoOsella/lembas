import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Checkbox } from 'primeng/checkbox';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { SupplierService } from '../../../core/services/supplier';
import { ProductService } from '../../../core/services/product';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppDataTable, ColumnDef } from '../../../shared/components/app-data-table/app-data-table';
import { AppFormField } from '../../../shared/components/app-form-field/app-form-field';
import { FormSection } from '../../../shared/components/form-section/form-section';
import { AppModal } from '../../../shared/components/app-modal/app-modal';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppProductSelector } from '../../../shared/components/app-product-selector/app-product-selector';
import { AppSearchBar } from '../../../shared/components/app-search-bar/app-search-bar';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ErrorAlert } from '../../../shared/components/error-alert/error-alert';
import { ProductSummary } from '../../../shared/models/product';
import { SupplierDto, SupplierProductDto } from '../../../shared/models/supplier';

/** Backend-supported supplier fields that can be used for server-side sorting. */
const SUPPLIER_SORT_FIELDS = new Set(['name', 'contactName', 'cuit']);

/** Backend-supported supplier-product fields that can be used for server-side sorting. */
const SUPPLIER_PRODUCT_SORT_FIELDS = new Set(['productName', 'supplierName', 'supplierSku', 'currentCost', 'preferred']);

/** Admin page for supplier CRUD and product-supplier replacement costs. */
@Component({
  selector: 'app-suppliers',
  imports: [
    AppButton,
    AppDataTable,
    AppFormField,
    FormSection,
    AppModal,
    AppPageHeader,
    AppProductSelector,
    AppSearchBar,
    Checkbox,
    ConfirmDialog,
    ErrorAlert,
    FormsModule,
    InputNumber,
    Select,
  ],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.css',
})
export class Suppliers {
  private readonly supplierService = inject(SupplierService);
  private readonly productService = inject(ProductService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  protected readonly suppliers = signal<SupplierDto[]>([]);
  protected readonly supplierProducts = signal<SupplierProductDto[]>([]);
  protected readonly allSuppliers = signal<SupplierDto[]>([]);
  protected readonly productSuggestions = signal<ProductSummary[]>([]);
  protected readonly loadingSuppliers = signal(true);
  protected readonly loadingProducts = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly productSearch = signal('');
  protected readonly selectedSupplierFilter = signal<number | null>(null);

  // -- Supplier table pagination ----------------------------------------------
  protected readonly supplierFirst = signal(0);
  protected readonly supplierPageSize = signal(10);
  protected readonly supplierTotalRecords = signal(0);
  protected readonly supplierSortField = signal<string | undefined>(undefined);
  protected readonly supplierSortOrder = signal<number | undefined>(undefined);

  // -- Supplier-product table pagination --------------------------------------
  protected readonly productFirst = signal(0);
  protected readonly productPageSize = signal(10);
  protected readonly productTotalRecords = signal(0);
  protected readonly productSortField = signal<string | undefined>(undefined);
  protected readonly productSortOrder = signal<number | undefined>(undefined);

  protected readonly supplierDialogVisible = signal(false);
  protected readonly supplierProductDialogVisible = signal(false);
  protected readonly supplierToDelete = signal<SupplierDto | null>(null);
  protected readonly supplierProductToDelete = signal<SupplierProductDto | null>(null);
  protected readonly editingSupplier = signal<SupplierDto | null>(null);
  protected readonly editingSupplierProduct = signal<SupplierProductDto | null>(null);
  protected readonly selectedProduct = signal<ProductSummary | null>(null);

  protected readonly supplierFormName = signal('');
  protected readonly supplierFormContactName = signal('');
  protected readonly supplierFormPhone = signal('');
  protected readonly supplierFormEmail = signal('');
  protected readonly supplierFormCuit = signal('');
  protected readonly supplierProductFormSupplierId = signal<number | null>(null);
  protected readonly supplierProductFormSupplierSku = signal('');
  protected readonly supplierProductFormCurrentCost = signal<number | null>(null);
  protected readonly supplierProductFormPreferred = signal(false);

  protected readonly supplierColumns: ColumnDef[] = [
    { field: 'name', header: 'Proveedor', sortable: true },
    { field: 'contactName', header: 'Contacto', sortable: true },
    { field: 'phone', header: 'Telefono', sortable: false },
    { field: 'email', header: 'Email', sortable: false },
    { field: 'cuit', header: 'CUIT', sortable: true },
    { field: 'actions', header: 'Acciones', sortable: false, width: '11rem' },
  ];

  protected readonly supplierProductColumns: ColumnDef[] = [
    { field: 'productName', header: 'Producto', sortable: true },
    { field: 'supplierName', header: 'Proveedor', sortable: true },
    { field: 'supplierSku', header: 'SKU proveedor', sortable: true },
    { field: 'currentCost', header: 'Costo reposicion', sortable: true },
    { field: 'preferred', header: 'Preferido', sortable: true },
    { field: 'actions', header: 'Acciones', sortable: false, width: '7rem' },
  ];

  protected readonly supplierOptions = computed(() => this.allSuppliers().map((supplier) => ({ label: supplier.name, value: supplier.id })));

  constructor() {
    this.refreshAll();
  }

  /** Reloads suppliers, supplier products, and the full supplier list for dropdowns. */
  protected refreshAll(): void {
    this.loadAllSuppliersForDropdown();
    this.loadSuppliers();
    this.loadSupplierProducts();
  }

  /** Applies supplier search filter, resetting to first page. */
  protected onSearch(query: string): void {
    this.search.set(query);
    this.supplierFirst.set(0);
    this.loadSuppliers();
  }

  /** Clears supplier search filter, resetting to first page. */
  protected clearSearch(): void {
    this.onSearch('');
  }

  /** Applies product search filter, resetting to first page. */
  protected onProductSearch(query: string): void {
    this.productSearch.set(query);
    this.productFirst.set(0);
    this.loadSupplierProducts();
  }

  /** Clears product search filter, resetting to first page. */
  protected clearProductSearch(): void {
    this.onProductSearch('');
  }

  /** Opens the supplier create dialog. */
  protected openSupplierCreate(): void {
    this.editingSupplier.set(null);
    this.supplierFormName.set('');
    this.supplierFormContactName.set('');
    this.supplierFormPhone.set('');
    this.supplierFormEmail.set('');
    this.supplierFormCuit.set('');
    this.supplierDialogVisible.set(true);
  }

  /** Opens the supplier edit dialog. */
  protected openSupplierEdit(supplier: SupplierDto): void {
    this.editingSupplier.set(supplier);
    this.supplierFormName.set(supplier.name);
    this.supplierFormContactName.set(supplier.contactName ?? '');
    this.supplierFormPhone.set(supplier.phone ?? '');
    this.supplierFormEmail.set(supplier.email ?? '');
    this.supplierFormCuit.set(supplier.cuit ?? '');
    this.supplierDialogVisible.set(true);
  }

  /** Persists supplier create or update. */
  protected saveSupplier(): void {
    const name = this.supplierFormName().trim();
    if (!name) {
      this.error.set('El nombre del proveedor es obligatorio.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const request = {
      name: name,
      contactName: this.blankToNull(this.supplierFormContactName()),
      phone: this.blankToNull(this.supplierFormPhone()),
      email: this.blankToNull(this.supplierFormEmail()),
      cuit: this.blankToNull(this.supplierFormCuit()),
    };
    const current = this.editingSupplier();
    const action = current ? this.supplierService.updateSupplier(current.id, request) : this.supplierService.createSupplier(request);
    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.supplierDialogVisible.set(false);
        this.messageService.add({ severity: 'success', summary: 'Proveedor guardado', detail: 'Los datos del proveedor fueron actualizados.' });
        this.refreshAll();
      },
      error: (error) => this.handleSaveError(error, 'No pudimos guardar el proveedor.'),
    });
  }

  /** Opens the supplier-product create dialog. */
  protected openSupplierProductCreate(supplier?: SupplierDto): void {
    this.editingSupplierProduct.set(null);
    this.selectedProduct.set(null);
    this.supplierProductFormSupplierId.set(supplier?.id ?? null);
    this.supplierProductFormSupplierSku.set('');
    this.supplierProductFormCurrentCost.set(null);
    this.supplierProductFormPreferred.set(false);
    this.supplierProductDialogVisible.set(true);
  }

  /** Opens the supplier-product edit dialog. */
  protected openSupplierProductEdit(item: SupplierProductDto): void {
    this.editingSupplierProduct.set(item);
    this.selectedProduct.set({ id: item.productId, name: item.productName, barcode: item.productBarcode ?? null } as ProductSummary);
    this.supplierProductFormSupplierId.set(item.supplierId);
    this.supplierProductFormSupplierSku.set(item.supplierSku ?? '');
    this.supplierProductFormCurrentCost.set(item.currentCost);
    this.supplierProductFormPreferred.set(item.preferred);
    this.supplierProductDialogVisible.set(true);
  }

  /** Searches products for the product-supplier association selector. */
  protected searchProducts(query: string): void {
    if (query.length < 2) {
      this.productSuggestions.set([]);
      return;
    }
    this.productService.listAdminProducts({ search: query, size: 10 }).subscribe({
      next: (page) => this.productSuggestions.set(page.content),
      error: () => this.productSuggestions.set([]),
    });
  }

  /** Persists supplier-product association create or update. */
  protected saveSupplierProduct(): void {
    const supplierId = this.supplierProductFormSupplierId();
    const supplierSku = this.supplierProductFormSupplierSku();
    const currentCost = this.supplierProductFormCurrentCost();
    const preferred = this.supplierProductFormPreferred();
    const product = this.selectedProduct();
    if (!product || !supplierId || currentCost === null || Number(currentCost) < 0) {
      this.error.set('Selecciona producto, proveedor y un costo de reposicion valido.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const request = { productId: product.id, supplierId: supplierId, supplierSku: this.blankToNull(supplierSku), currentCost: Number(currentCost), preferred: preferred };
    const current = this.editingSupplierProduct();
    const action = current ? this.supplierService.updateSupplierProduct(current.id, request) : this.supplierService.createSupplierProduct(request);
    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.supplierProductDialogVisible.set(false);
        this.messageService.add({ severity: 'success', summary: 'Costo guardado', detail: 'La relacion proveedor-producto fue actualizada.' });
        this.loadSupplierProducts();
      },
      error: (error) => this.handleSaveError(error, 'No pudimos guardar el producto del proveedor.'),
    });
  }

  /** Deletes a supplier after confirmation. */
  protected confirmDeleteSupplier(): void {
    const supplier = this.supplierToDelete();
    if (!supplier) return;
    this.supplierService.deleteSupplier(supplier.id).subscribe({
      next: () => {
        this.supplierToDelete.set(null);
        this.messageService.add({ severity: 'success', summary: 'Proveedor eliminado', detail: supplier.name });
        this.refreshAll();
      },
      error: (error) => this.error.set(this.messageForError(error, 'No pudimos eliminar el proveedor.')),
    });
  }

  /** Deletes a supplier-product association after confirmation. */
  protected confirmDeleteSupplierProduct(): void {
    const item = this.supplierProductToDelete();
    if (!item) return;
    this.supplierService.deleteSupplierProduct(item.id).subscribe({
      next: () => {
        this.supplierProductToDelete.set(null);
        this.messageService.add({ severity: 'success', summary: 'Asociacion eliminada', detail: item.productName });
        this.loadSupplierProducts();
      },
      error: (error) => this.error.set(this.messageForError(error, 'No pudimos eliminar la asociacion.')),
    });
  }

  /** Formats money values for Argentina pesos. */
  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  }

  // ---------------------------------------------------------------------------
  // Pagination handlers — supplier table
  // ---------------------------------------------------------------------------

  /** Handles page change on the supplier table. */
  protected onSupplierPageChange(event: { first: number; rows: number }): void {
    this.supplierFirst.set(event.first);
    this.supplierPageSize.set(event.rows);
    this.loadSuppliers();
  }

  /** Handles sort change on the supplier table. */
  protected onSupplierSort(event: { field: string; order: number }): void {
    this.supplierFirst.set(0);

    if (!SUPPLIER_SORT_FIELDS.has(event.field) || ![1, -1].includes(event.order)) {
      this.supplierSortField.set(undefined);
      this.supplierSortOrder.set(undefined);
      this.loadSuppliers();
      return;
    }

    this.supplierSortField.set(event.field);
    this.supplierSortOrder.set(event.order);
    this.loadSuppliers();
  }

  // ---------------------------------------------------------------------------
  // Pagination handlers — supplier-product table
  // ---------------------------------------------------------------------------

  /** Handles page change on the supplier-product table. */
  protected onProductPageChange(event: { first: number; rows: number }): void {
    this.productFirst.set(event.first);
    this.productPageSize.set(event.rows);
    this.loadSupplierProducts();
  }

  /** Handles sort change on the supplier-product table. */
  protected onProductSort(event: { field: string; order: number }): void {
    this.productFirst.set(0);

    if (!SUPPLIER_PRODUCT_SORT_FIELDS.has(event.field) || ![1, -1].includes(event.order)) {
      this.productSortField.set(undefined);
      this.productSortOrder.set(undefined);
      this.loadSupplierProducts();
      return;
    }

    this.productSortField.set(event.field);
    this.productSortOrder.set(event.order);
    this.loadSupplierProducts();
  }

  // ---------------------------------------------------------------------------
  // Data loading (lazy pagination)
  // ---------------------------------------------------------------------------

  /** Builds a Spring Data sort param from field and order signals. */
  private buildSortParam(field: string | undefined, order: number | undefined, defaultField: string): string | undefined {
    if (!field || ![1, -1].includes(order ?? 0)) {
      return undefined;
    }
    return `${field},${order === 1 ? 'asc' : 'desc'}`;
  }

  /** Loads the supplier table with lazy pagination. */
  private loadSuppliers(): void {
    this.loadingSuppliers.set(true);
    const page = Math.floor(this.supplierFirst() / this.supplierPageSize());
    const sort = this.buildSortParam(this.supplierSortField(), this.supplierSortOrder(), 'name');
    this.supplierService
      .listSuppliers({ search: this.search(), page, size: this.supplierPageSize(), sort })
      .subscribe({
        next: (response) => {
          this.suppliers.set(response.content);
          this.supplierTotalRecords.set(response.totalElements);
          this.loadingSuppliers.set(false);
        },
        error: (error) => {
          this.error.set(this.messageForError(error, 'No pudimos cargar los proveedores.'));
          this.loadingSuppliers.set(false);
        },
      });
  }

  /** Loads the full supplier list (no pagination) for dropdowns in forms. */
  private loadAllSuppliersForDropdown(): void {
    this.supplierService.listSuppliers({ size: 500 }).subscribe({
      next: (response) => this.allSuppliers.set(response.content),
      error: () => this.allSuppliers.set([]),
    });
  }

  /** Loads product-supplier replacement costs with lazy pagination. */
  private loadSupplierProducts(): void {
    this.loadingProducts.set(true);
    const page = Math.floor(this.productFirst() / this.productPageSize());
    const sort = this.buildSortParam(this.productSortField(), this.productSortOrder(), 'productName');
    this.supplierService
      .listSupplierProducts({ search: this.productSearch(), page, size: this.productPageSize(), sort })
      .subscribe({
        next: (response) => {
          this.supplierProducts.set(response.content);
          this.productTotalRecords.set(response.totalElements);
          this.loadingProducts.set(false);
        },
        error: (error) => {
          this.error.set(this.messageForError(error, 'No pudimos cargar los costos de proveedores.'));
          this.loadingProducts.set(false);
        },
      });
  }

  /** Handles save errors consistently. */
  private handleSaveError(error: unknown, fallback: string): void {
    this.saving.set(false);
    this.error.set(this.messageForError(error, fallback));
  }

  /** Maps backend errors to user-facing messages. */
  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    return apiError ? this.errorMapping.getMessage(apiError.code, apiError.message) : fallback;
  }

  /** Converts empty text fields to null for API requests. */
  private blankToNull(value: string): string | null {
    return value.trim() ? value.trim() : null;
  }
}
