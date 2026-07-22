import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppCheckbox } from '@shared/components/app-checkbox/app-checkbox';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppModal } from '@shared/components/app-modal/app-modal';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppProductSelector } from '@features/catalog/public-api';
import { AppSearchBar } from '@shared/components/app-search-bar/app-search-bar';
import { AppSelect } from '@shared/components/app-select/app-select';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { FormSection } from '@shared/components/form-section/form-section';
import type { SupplierDto, SupplierProductDto } from '@features/suppliers/domain/supplier';
import { SuppliersPageStore } from '@features/suppliers/public-api';

/** Admin page shell for supplier and supplier-product management. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-suppliers',
  imports: [
    AppButton,
    AppCheckbox,
    AppDataTable,
    AppFormField,
    AppInputNumber,
    AppModal,
    AppPageHeader,
    AppProductSelector,
    AppSearchBar,
    AppSelect,
    ConfirmDialog,
    ErrorAlert,
    FormSection,
    FormsModule,
  ],
  providers: [SuppliersPageStore],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.css',
})
export class Suppliers {
  private readonly store = inject(SuppliersPageStore);
  // These aliases keep the existing template contract while moving state to the page store.
  protected readonly suppliers = this.store.suppliers;
  protected readonly supplierProducts = this.store.supplierProducts;
  protected readonly allSuppliers = this.store.allSuppliers;
  protected readonly productSuggestions = this.store.productSuggestions;
  protected readonly loadingSuppliers = this.store.loadingSuppliers;
  protected readonly loadingProducts = this.store.loadingProducts;
  protected readonly saving = this.store.saving;
  protected readonly error = this.store.error;
  protected readonly search = this.store.search;
  protected readonly productSearch = this.store.productSearch;
  protected readonly supplierFirst = this.store.supplierFirst;
  protected readonly supplierPageSize = this.store.supplierPageSize;
  protected readonly supplierTotalRecords = this.store.supplierTotalRecords;
  protected readonly productFirst = this.store.productFirst;
  protected readonly productPageSize = this.store.productPageSize;
  protected readonly productTotalRecords = this.store.productTotalRecords;
  protected readonly supplierDialogVisible = this.store.supplierDialogVisible;
  protected readonly supplierProductDialogVisible = this.store.supplierProductDialogVisible;
  protected readonly supplierToDelete = this.store.supplierToDelete;
  protected readonly supplierProductToDelete = this.store.supplierProductToDelete;
  protected readonly editingSupplier = this.store.editingSupplier;
  protected readonly editingSupplierProduct = this.store.editingSupplierProduct;
  protected readonly selectedProduct = this.store.selectedProduct;
  protected readonly supplierFormName = this.store.supplierFormName;
  protected readonly supplierFormContactName = this.store.supplierFormContactName;
  protected readonly supplierFormPhone = this.store.supplierFormPhone;
  protected readonly supplierFormEmail = this.store.supplierFormEmail;
  protected readonly supplierFormCuit = this.store.supplierFormCuit;
  protected readonly supplierProductFormSupplierId = this.store.supplierProductFormSupplierId;
  protected readonly supplierProductFormSupplierSku = this.store.supplierProductFormSupplierSku;
  protected readonly supplierProductFormCurrentCost = this.store.supplierProductFormCurrentCost;
  protected readonly supplierProductFormPreferred = this.store.supplierProductFormPreferred;

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
  protected readonly supplierOptions = computed(() =>
    this.allSuppliers().map((supplier) => ({ label: supplier.name, value: supplier.id })),
  );

  constructor() {
    this.store.loadInitial();
  }

  protected refreshAll(): void {
    this.store.loadInitial();
  }

  protected onSearch(query: string): void {
    this.store.onSearch(query);
  }

  protected clearSearch(): void {
    this.store.onSearch('');
  }

  protected onProductSearch(query: string): void {
    this.store.onProductSearch(query);
  }

  protected clearProductSearch(): void {
    this.store.onProductSearch('');
  }

  protected openSupplierCreate(): void {
    this.store.openSupplierCreate();
  }

  protected openSupplierEdit(supplier: SupplierDto): void {
    this.store.openSupplierEdit(supplier);
  }

  protected saveSupplier(): void {
    this.store.saveSupplier();
  }

  protected openSupplierProductCreate(supplier?: SupplierDto): void {
    this.store.openSupplierProductCreate(supplier);
  }

  protected openSupplierProductEdit(item: SupplierProductDto): void {
    this.store.openSupplierProductEdit(item);
  }

  protected searchProducts(query: string): void {
    this.store.searchProducts(query);
  }

  protected saveSupplierProduct(): void {
    this.store.saveSupplierProduct();
  }

  protected confirmDeleteSupplier(): void {
    this.store.confirmDeleteSupplier();
  }

  protected confirmDeleteSupplierProduct(): void {
    this.store.confirmDeleteSupplierProduct();
  }

  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  }

  protected onSupplierPageChange(event: { first: number; rows: number }): void {
    this.store.onSupplierPageChange(event);
  }

  protected onSupplierSort(event: { field: string; order: number }): void {
    this.store.onSupplierSort(event);
  }

  protected onProductPageChange(event: { first: number; rows: number }): void {
    this.store.onProductPageChange(event);
  }

  protected onProductSort(event: { field: string; order: number }): void {
    this.store.onProductSort(event);
  }
}
