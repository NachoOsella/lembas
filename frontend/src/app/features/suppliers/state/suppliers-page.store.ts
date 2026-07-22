import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { catchError, map, of, Subject, switchMap, tap } from 'rxjs';

import { ErrorMappingService } from '@core/services/error-mapping';
import { ProductService } from '@features/catalog/data-access/product';
import type { ProductSummary } from '@features/catalog/domain/product';
import { getApiError } from '@shared/types/api-error';
import { SupplierService } from '../data-access/supplier';
import type { SupplierDto, SupplierProductDto } from '../domain/supplier';
import {
  createSupplierProductRequest,
  createSupplierRequest,
  isSupplierFormValid,
  isSupplierProductFormValid,
  toSupplierFilters,
  toSupplierProductFilters,
  type SupplierFormValue,
  type SupplierProductFormValue,
  type SupplierTableState,
} from '../domain/supplier-page';

export type SupplierViewState = 'loading' | 'error' | 'empty' | 'data';

type SupplierListResult =
  | { readonly kind: 'success'; readonly content: SupplierDto[]; readonly total: number }
  | { readonly kind: 'error'; readonly message: string };

type SupplierProductListResult =
  | { readonly kind: 'success'; readonly content: SupplierProductDto[]; readonly total: number }
  | { readonly kind: 'error'; readonly message: string };

/** Page-scoped state and effects for supplier and supplier-product administration. */
@Injectable()
export class SuppliersPageStore {
  private readonly supplierService = inject(SupplierService);
  private readonly productService = inject(ProductService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  private readonly supplierRequests = new Subject<SupplierTableState>();
  private readonly supplierProductRequests = new Subject<SupplierTableState>();
  private readonly productSearchRequests = new Subject<string>();

  private readonly _suppliers = signal<SupplierDto[]>([]);
  private readonly _supplierProducts = signal<SupplierProductDto[]>([]);
  private readonly _allSuppliers = signal<SupplierDto[]>([]);
  private readonly _productSuggestions = signal<ProductSummary[]>([]);
  private readonly _loadingSuppliers = signal(false);
  private readonly _loadingProducts = signal(false);
  private readonly _loadingLookups = signal(false);
  private readonly _saving = signal(false);
  private readonly _supplierError = signal('');
  private readonly _supplierProductError = signal('');
  private readonly _error = signal('');
  private readonly _supplierTotalRecords = signal(0);
  private readonly _productTotalRecords = signal(0);

  readonly suppliers = this._suppliers;
  readonly supplierProducts = this._supplierProducts;
  readonly allSuppliers = this._allSuppliers;
  readonly productSuggestions = this._productSuggestions;
  readonly loadingSuppliers = this._loadingSuppliers;
  readonly loadingProducts = this._loadingProducts;
  readonly loadingLookups = this._loadingLookups;
  readonly saving = this._saving;
  readonly supplierError = this._supplierError;
  readonly supplierProductError = this._supplierProductError;
  readonly error = this._error;
  readonly supplierTotalRecords = this._supplierTotalRecords;
  readonly productTotalRecords = this._productTotalRecords;
  readonly supplierViewState = computed<SupplierViewState>(() =>
    this.toViewState(this._loadingSuppliers(), this._supplierError(), this._suppliers().length),
  );
  readonly supplierProductViewState = computed<SupplierViewState>(() =>
    this.toViewState(
      this._loadingProducts(),
      this._supplierProductError(),
      this._supplierProducts().length,
    ),
  );

  // Dialog and form state stays page-scoped rather than leaking into a root service.
  readonly supplierDialogVisible = signal(false);
  readonly supplierProductDialogVisible = signal(false);
  readonly supplierToDelete = signal<SupplierDto | null>(null);
  readonly supplierProductToDelete = signal<SupplierProductDto | null>(null);
  readonly editingSupplier = signal<SupplierDto | null>(null);
  readonly editingSupplierProduct = signal<SupplierProductDto | null>(null);
  readonly selectedProduct = signal<ProductSummary | null>(null);
  readonly supplierFormName = signal('');
  readonly supplierFormContactName = signal('');
  readonly supplierFormPhone = signal('');
  readonly supplierFormEmail = signal('');
  readonly supplierFormCuit = signal('');
  readonly supplierProductFormSupplierId = signal<number | null>(null);
  readonly supplierProductFormSupplierSku = signal('');
  readonly supplierProductFormCurrentCost = signal<number | null>(null);
  readonly supplierProductFormPreferred = signal(false);
  readonly supplierFirst = signal(0);
  readonly supplierPageSize = signal(10);
  readonly supplierSortField = signal<string | undefined>(undefined);
  readonly supplierSortOrder = signal<number | undefined>(undefined);
  readonly productFirst = signal(0);
  readonly productPageSize = signal(10);
  readonly productSortField = signal<string | undefined>(undefined);
  readonly productSortOrder = signal<number | undefined>(undefined);
  readonly search = signal('');
  readonly productSearch = signal('');
  readonly selectedSupplierFilter = signal<number | null>(null);

  constructor() {
    this.supplierRequests
      .pipe(
        tap(() => {
          this._loadingSuppliers.set(true);
          this._supplierError.set('');
        }),
        switchMap((state) =>
          this.supplierService.listSuppliers(toSupplierFilters(state)).pipe(
            map(
              (page): SupplierListResult => ({
                kind: 'success',
                content: page.content,
                total: page.totalElements,
              }),
            ),
            catchError((error: unknown) =>
              of<SupplierListResult>({
                kind: 'error',
                message: this.messageForError(error, 'No pudimos cargar los proveedores.'),
              }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this._loadingSuppliers.set(false);
        if (result.kind === 'error') {
          this._supplierError.set(result.message);
          this._error.set(result.message);
          return;
        }
        this._suppliers.set(result.content);
        this._supplierTotalRecords.set(result.total);
      });

    this.supplierProductRequests
      .pipe(
        tap(() => {
          this._loadingProducts.set(true);
          this._supplierProductError.set('');
        }),
        switchMap((state) =>
          this.supplierService.listSupplierProducts(toSupplierProductFilters(state)).pipe(
            map(
              (page): SupplierProductListResult => ({
                kind: 'success',
                content: page.content,
                total: page.totalElements,
              }),
            ),
            catchError((error: unknown) =>
              of<SupplierProductListResult>({
                kind: 'error',
                message: this.messageForError(
                  error,
                  'No pudimos cargar los costos de proveedores.',
                ),
              }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this._loadingProducts.set(false);
        if (result.kind === 'error') {
          this._supplierProductError.set(result.message);
          this._error.set(result.message);
          return;
        }
        this._supplierProducts.set(result.content);
        this._productTotalRecords.set(result.total);
      });

    this.productSearchRequests
      .pipe(
        switchMap((query) =>
          this.productService.listAdminProducts({ search: query, size: 10 }).pipe(
            map((page) => page.content),
            catchError(() => of<ProductSummary[]>([])),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((products) => this._productSuggestions.set(products));
  }

  /** Loads both tables and the supplier lookup used by forms. */
  loadInitial(): void {
    this.loadAllSuppliersForDropdown();
    this.loadSuppliers();
    this.loadSupplierProducts();
  }

  /** Reloads the supplier table with its current filters. */
  loadSuppliers(): void {
    this.supplierRequests.next({
      search: this.search(),
      first: this.supplierFirst(),
      pageSize: this.supplierPageSize(),
      sortField: this.supplierSortField(),
      sortOrder: this.supplierSortOrder(),
    });
  }

  /** Reloads the supplier-product table with its current filters. */
  loadSupplierProducts(): void {
    this.supplierProductRequests.next({
      search: this.productSearch(),
      first: this.productFirst(),
      pageSize: this.productPageSize(),
      sortField: this.productSortField(),
      sortOrder: this.productSortOrder(),
    });
  }

  /** Applies a supplier search and resets the table page. */
  onSearch(query: string): void {
    this.search.set(query);
    this.supplierFirst.set(0);
    this.loadSuppliers();
  }

  /** Applies a supplier-product search and resets the table page. */
  onProductSearch(query: string): void {
    this.productSearch.set(query);
    this.productFirst.set(0);
    this.loadSupplierProducts();
  }

  /** Applies supplier table pagination. */
  onSupplierPageChange(event: { readonly first: number; readonly rows: number }): void {
    this.supplierFirst.set(event.first);
    this.supplierPageSize.set(event.rows);
    this.loadSuppliers();
  }

  /** Applies supplier table sorting. */
  onSupplierSort(event: { readonly field: string; readonly order: number }): void {
    this.supplierFirst.set(0);
    this.supplierSortField.set(event.field);
    this.supplierSortOrder.set([1, -1].includes(event.order) ? event.order : undefined);
    this.loadSuppliers();
  }

  /** Applies supplier-product table pagination. */
  onProductPageChange(event: { readonly first: number; readonly rows: number }): void {
    this.productFirst.set(event.first);
    this.productPageSize.set(event.rows);
    this.loadSupplierProducts();
  }

  /** Applies supplier-product table sorting. */
  onProductSort(event: { readonly field: string; readonly order: number }): void {
    this.productFirst.set(0);
    this.productSortField.set(event.field);
    this.productSortOrder.set([1, -1].includes(event.order) ? event.order : undefined);
    this.loadSupplierProducts();
  }

  /** Opens a blank supplier form. */
  openSupplierCreate(): void {
    this.editingSupplier.set(null);
    this.supplierFormName.set('');
    this.supplierFormContactName.set('');
    this.supplierFormPhone.set('');
    this.supplierFormEmail.set('');
    this.supplierFormCuit.set('');
    this.supplierDialogVisible.set(true);
  }

  /** Opens a supplier form with existing values. */
  openSupplierEdit(supplier: SupplierDto): void {
    this.editingSupplier.set(supplier);
    this.supplierFormName.set(supplier.name);
    this.supplierFormContactName.set(supplier.contactName ?? '');
    this.supplierFormPhone.set(supplier.phone ?? '');
    this.supplierFormEmail.set(supplier.email ?? '');
    this.supplierFormCuit.set(supplier.cuit ?? '');
    this.supplierDialogVisible.set(true);
  }

  /** Saves a supplier after pure form validation and request adaptation. */
  saveSupplier(): void {
    const value: SupplierFormValue = {
      name: this.supplierFormName(),
      contactName: this.supplierFormContactName(),
      phone: this.supplierFormPhone(),
      email: this.supplierFormEmail(),
      cuit: this.supplierFormCuit(),
    };
    if (!isSupplierFormValid(value)) {
      this._error.set('El nombre del proveedor es obligatorio.');
      return;
    }
    this._saving.set(true);
    this._error.set('');
    const current = this.editingSupplier();
    const request = createSupplierRequest(value);
    const operation = current
      ? this.supplierService.updateSupplier(current.id, request)
      : this.supplierService.createSupplier(request);
    operation.subscribe({
      next: () => {
        this._saving.set(false);
        this.supplierDialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Proveedor guardado',
          detail: 'Los datos del proveedor fueron actualizados.',
        });
        this.loadInitial();
      },
      error: (error: unknown) => this.handleSaveError(error, 'No pudimos guardar el proveedor.'),
    });
  }

  /** Opens a blank supplier-product association form. */
  openSupplierProductCreate(supplier?: SupplierDto): void {
    this.editingSupplierProduct.set(null);
    this.selectedProduct.set(null);
    this.supplierProductFormSupplierId.set(supplier?.id ?? null);
    this.supplierProductFormSupplierSku.set('');
    this.supplierProductFormCurrentCost.set(null);
    this.supplierProductFormPreferred.set(false);
    this.supplierProductDialogVisible.set(true);
  }

  /** Opens a supplier-product form with existing values. */
  openSupplierProductEdit(item: SupplierProductDto): void {
    this.editingSupplierProduct.set(item);
    this.selectedProduct.set({
      id: item.productId,
      name: item.productName,
      barcode: item.productBarcode ?? undefined,
      salePrice: 0,
      onlineStatus: 'PUBLISHED',
      categoryId: 0,
      categoryName: '',
    });
    this.supplierProductFormSupplierId.set(item.supplierId);
    this.supplierProductFormSupplierSku.set(item.supplierSku ?? '');
    this.supplierProductFormCurrentCost.set(item.currentCost);
    this.supplierProductFormPreferred.set(item.preferred);
    this.supplierProductDialogVisible.set(true);
  }

  /** Searches products for the association selector. */
  searchProducts(query: string): void {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      this._productSuggestions.set([]);
      return;
    }
    this.productSearchRequests.next(normalizedQuery);
  }

  /** Saves a supplier-product association after validation. */
  saveSupplierProduct(): void {
    const value: SupplierProductFormValue = {
      product: this.selectedProduct(),
      supplierId: this.supplierProductFormSupplierId(),
      supplierSku: this.supplierProductFormSupplierSku(),
      currentCost: this.supplierProductFormCurrentCost(),
      preferred: this.supplierProductFormPreferred(),
    };
    if (!isSupplierProductFormValid(value)) {
      this._error.set('Selecciona producto, proveedor y un costo de reposicion valido.');
      return;
    }
    this._saving.set(true);
    this._error.set('');
    const current = this.editingSupplierProduct();
    const request = createSupplierProductRequest(value);
    const operation = current
      ? this.supplierService.updateSupplierProduct(current.id, request)
      : this.supplierService.createSupplierProduct(request);
    operation.subscribe({
      next: () => {
        this._saving.set(false);
        this.supplierProductDialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Costo guardado',
          detail: 'La relacion proveedor-producto fue actualizada.',
        });
        this.loadSupplierProducts();
      },
      error: (error: unknown) =>
        this.handleSaveError(error, 'No pudimos guardar el producto del proveedor.'),
    });
  }

  /** Deletes the selected supplier. */
  confirmDeleteSupplier(): void {
    const supplier = this.supplierToDelete();
    if (!supplier) return;
    this.supplierService.deleteSupplier(supplier.id).subscribe({
      next: () => {
        this.supplierToDelete.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Proveedor eliminado',
          detail: supplier.name,
        });
        this.loadInitial();
      },
      error: (error: unknown) =>
        this._error.set(this.messageForError(error, 'No pudimos eliminar el proveedor.')),
    });
  }

  /** Deletes the selected supplier-product association. */
  confirmDeleteSupplierProduct(): void {
    const item = this.supplierProductToDelete();
    if (!item) return;
    this.supplierService.deleteSupplierProduct(item.id).subscribe({
      next: () => {
        this.supplierProductToDelete.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Asociacion eliminada',
          detail: item.productName,
        });
        this.loadSupplierProducts();
      },
      error: (error: unknown) =>
        this._error.set(this.messageForError(error, 'No pudimos eliminar la asociacion.')),
    });
  }

  private loadAllSuppliersForDropdown(): void {
    this._loadingLookups.set(true);
    this.supplierService.listSuppliers({ page: 0, size: 500, sort: 'name,asc' }).subscribe({
      next: (page) => {
        this._allSuppliers.set(page.content);
        this._loadingLookups.set(false);
      },
      error: (error: unknown) => {
        this._allSuppliers.set([]);
        this._loadingLookups.set(false);
        this._error.set(this.messageForError(error, 'No pudimos cargar los proveedores.'));
      },
    });
  }

  private handleSaveError(error: unknown, fallback: string): void {
    this._saving.set(false);
    this._error.set(this.messageForError(error, fallback));
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    if (!apiError) return fallback;
    return apiError.code === 'VALIDATION_ERROR'
      ? this.errorMapping.formatValidationErrors(apiError)
      : this.errorMapping.getMessage(apiError.code, fallback);
  }

  private toViewState(loading: boolean, error: string, itemCount: number): SupplierViewState {
    if (error) return 'error';
    if (loading) return 'loading';
    return itemCount > 0 ? 'data' : 'empty';
  }
}
