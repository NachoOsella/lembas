import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { ApiErrorResponse, getApiError } from '../../../../shared/models/api-error';
import { CategoryService } from '../../../../core/services/category';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { ProductService } from '../../../../core/services/product';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppFormField } from '../../../../shared/components/app-form-field/app-form-field';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { FormSection } from '../../../../shared/components/form-section/form-section';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { CategoryDto } from '../../../../shared/models/category';
import {
  ProductDetail,
  ProductOnlineStatus,
  ProductRequest,
} from '../../../../shared/models/product';
import { PRODUCT_STATUS_ACTIONS } from '../../../../shared/models/product-status';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

/** Create and edit form for admin catalog products with local image preview. */
@Component({
  selector: 'app-product-form',
  imports: [
    AppButton,
    AppFormField,
    AppPageHeader,
    ErrorAlert,
    FormSection,
    FormsModule,
    InputNumber,
    RouterLink,
    Select,
    Skeleton,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly productId = signal<number | null>(null);
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly brandName = signal('');
  protected readonly barcode = signal('');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly salePrice = signal<number | null>(0);
  protected readonly minimumStock = signal<number | null>(0);
  protected readonly imageUrl = signal('');
  protected readonly onlineStatus = signal<ProductOnlineStatus>('DRAFT');

  protected readonly editing = computed(() => this.productId() !== null);
  protected readonly title = computed(() =>
    this.editing() ? 'Editar producto' : 'Nuevo producto',
  );
  protected readonly imagePreview = computed(
    () => this.imageUrl().trim() || '/assets/product-placeholder.svg',
  );
  protected readonly categoryOptions = computed<Option<number>[]>(() =>
    this.categories().map((category) => ({ label: category.name, value: category.id })),
  );
  protected readonly statusOptions = computed(() => {
    const current = this.onlineStatus();
    if (!this.editing()) {
      // New product: only DRAFT is valid as initial status.
      return [{ label: 'Borrador', value: 'DRAFT' as ProductOnlineStatus }];
    }
    // Editing: show only valid transitions from the current status.
    return PRODUCT_STATUS_ACTIONS[current].map((action) => ({
      label: action.label,
      value: action.targetStatus,
    }));
  });
  protected readonly formValid = computed(
    () =>
      this.name().trim().length > 0 &&
      !!this.categoryId() &&
      this.salePrice() !== null &&
      Number(this.salePrice()) >= 0 &&
      this.barcodeValid(),
  );
  protected readonly barcodeValid = computed(() => {
    const value = this.barcode().trim();
    return value.length === 0 || /^[0-9A-Za-z._-]{4,100}$/.test(value);
  });

  constructor() {
    this.loadCategories();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.productId.set(id);
      this.loadProduct(id);
    }
  }

  /** Navigates back to the product list without saving. */
  protected cancel(): void {
    this.router.navigate(['/admin/products']);
  }

  /** Saves the form if all required fields are valid. */
  protected save(): void {
    this.submitted.set(true);
    this.error.set('');
    if (!this.formValid()) {
      return;
    }

    this.submitting.set(true);
    const payload = this.toRequest();
    const id = this.productId();
    const request$ = id
      ? this.productService.updateProduct(id, payload)
      : this.productService.createProduct(payload);
    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: id ? 'Producto actualizado' : 'Producto creado',
          detail: `${this.name().trim()} se guardo correctamente.`,
          life: 3000,
        });
        this.router.navigate(['/admin/products']);
      },
      error: (error) => {
        this.submitting.set(false);
        this.error.set(this.messageForError(error));
      },
    });
  }

  /** Reads a validated image file as a local data URL for preview and request persistence. */
  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      this.error.set('Selecciona una imagen JPG, PNG o WebP.');
      input.value = '';
      return;
    }

    if (file.size > maxBytes) {
      this.error.set('La imagen no puede superar los 2 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.imageUrl.set(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  /** Loads categories for the required selector. */
  private loadCategories(): void {
    this.categoryService.listAdminCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.error.set('No pudimos cargar las categorias.'),
    });
  }

  /** Loads an existing product for edition. */
  private loadProduct(id: number): void {
    this.loading.set(true);
    this.productService.getProduct(id).subscribe({
      next: (product) => {
        this.fillForm(product);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar el producto.');
        this.loading.set(false);
      },
    });
  }

  /** Copies product data into editable signals. */
  private fillForm(product: ProductDetail): void {
    this.name.set(product.name);
    this.description.set(product.description ?? '');
    this.brandName.set(product.brandName ?? '');
    this.barcode.set(product.barcode ?? '');
    this.categoryId.set(product.categoryId);
    this.salePrice.set(product.salePrice);
    this.minimumStock.set(product.minimumStock ?? 0);
    this.imageUrl.set(product.imageUrl ?? '');
    this.onlineStatus.set(product.onlineStatus);
  }

  /** Converts signal state to the backend request contract. */
  private toRequest(): ProductRequest {
    return {
      name: this.name().trim(),
      description: this.description().trim() || undefined,
      brandName: this.brandName().trim() || undefined,
      barcode: this.barcode().trim() || undefined,
      categoryId: this.categoryId()!,
      salePrice: Number(this.salePrice()),
      minimumStock: this.minimumStock() ?? undefined,
      imageUrl: this.imageUrl().trim() || undefined,
      onlineStatus: this.onlineStatus(),
    };
  }

  /** Maps backend errors to actionable Spanish copy using centralized service. */
  private messageForError(error: unknown): string {
    const apiError = getApiError(error);
    const code = apiError?.code;

    if (!code) {
      return 'No pudimos guardar el producto. Intenta nuevamente.';
    }

    // Feature-specific validation guidance
    if (code === 'VALIDATION_ERROR') {
      return 'Revisa los campos obligatorios antes de guardar.';
    }

    // Use centralized error mapping with product-specific context fallback
    return this.errorMapping.getMessage(
      code,
      'No pudimos guardar el producto. Intenta nuevamente.',
    );
  }
}
