import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { CategoryService } from '../../../../core/services/category';
import { ProductService } from '../../../../core/services/product';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { FormSection } from '../../../../shared/components/form-section/form-section';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { CategoryDto } from '../../../../shared/models/category';
import { ProductDetail, ProductOnlineStatus, ProductRequest } from '../../../../shared/models/product';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

/** Create and edit form for admin catalog products with local image preview. */
@Component({
  selector: 'app-product-form',
  imports: [AppButton, FormSection, FormsModule, InputNumber, InputText, RouterLink, Select, Skeleton],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductForm {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly messageService = inject(MessageService);
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
  protected readonly title = computed(() => (this.editing() ? 'Editar producto' : 'Nuevo producto'));
  protected readonly imagePreview = computed(() => this.imageUrl().trim() || '/assets/product-placeholder.svg');
  protected readonly categoryOptions = computed<Option<number>[]>(() =>
    this.categories().map((category) => ({ label: category.name, value: category.id })),
  );
  protected readonly statusOptions: Option<ProductOnlineStatus>[] = [
    { label: 'Borrador', value: 'DRAFT' },
    { label: 'Publicado', value: 'PUBLISHED' },
    { label: 'Pausado', value: 'PAUSED' },
    { label: 'Oculto', value: 'HIDDEN' },
  ];
  protected readonly formValid = computed(() =>
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
    const request$ = id ? this.productService.updateProduct(id, payload) : this.productService.createProduct(payload);
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
        this.error.set(this.messageForError(error?.error?.code));
      },
    });
  }

  /** Reads an image file as a local data URL for preview and request persistence. */
  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
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
        this.error.set('No pudimos cargar el producto solicitado.');
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

  /** Maps backend errors to actionable Spanish copy. */
  private messageForError(code?: string): string {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Revisa los campos obligatorios y el formato del barcode.',
      PRODUCT_BARCODE_DUPLICATED: 'Ya existe un producto activo con ese barcode.',
      CATEGORY_NOT_FOUND: 'La categoria seleccionada ya no existe.',
      PRODUCT_NOT_FOUND: 'El producto ya no existe o fue eliminado.',
    };
    return messages[code ?? ''] ?? 'No pudimos guardar el producto. Intenta nuevamente.';
  }
}
