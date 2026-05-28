import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { MessageService } from 'primeng/api';
import { CategoryService } from '../../../../core/services/category';
import { CategoryDto, CategoryRequest } from '../../../../shared/models/category';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppModal } from '../../../../shared/components/app-modal/app-modal';

interface ParentOption {
  readonly label: string;
  readonly value: number | null;
}

/** Modal form for creating and editing product categories with realtime validation. */
@Component({
  selector: 'app-category-form',
  imports: [AppButton, AppModal, FormsModule, InputText, Select],
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryForm {
  private readonly categoryService = inject(CategoryService);
  private readonly messageService = inject(MessageService);

  readonly categories = input.required<CategoryDto[]>();
  readonly saved = output<void>();

  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<CategoryDto | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formSubmitted = signal(false);
  protected readonly dialogError = signal('');
  protected readonly formName = signal('');
  protected readonly formParentId = signal<number | null>(null);
  protected readonly formDescription = signal('');

  protected readonly dialogTitle = computed(() =>
    this.editing() ? 'Editar categoria' : 'Nueva categoria',
  );
  protected readonly formNameValid = computed(() => this.formName().trim().length > 0);
  protected readonly parentOptions = computed<ParentOption[]>(() => [
    { label: 'Sin padre (raiz)', value: null },
    ...this.categories()
      .filter((category) => category.id !== this.editing()?.id)
      .map((category) => ({ label: category.name, value: category.id })),
  ]);

  /** Opens the modal in creation mode. */
  openCreate(): void {
    this.editing.set(null);
    this.formName.set('');
    this.formParentId.set(null);
    this.formDescription.set('');
    this.resetDialogState();
  }

  /** Opens the modal in edition mode. */
  openEdit(category: CategoryDto): void {
    this.editing.set(category);
    this.formName.set(category.name);
    this.formParentId.set(category.parentId ?? null);
    this.formDescription.set(category.description ?? '');
    this.resetDialogState();
  }

  /** Validates and persists the category form. */
  protected onSubmit(): void {
    this.formSubmitted.set(true);
    this.dialogError.set('');
    if (!this.formNameValid()) {
      return;
    }

    this.submitting.set(true);
    const payload = this.toRequest();
    const editing = this.editing();
    const request$ = editing
      ? this.categoryService.updateCategory(editing.id, payload)
      : this.categoryService.createCategory(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.dialogVisible.set(false);
        const isEdit = !!editing;
        this.messageService.add({
          severity: 'success',
          summary: isEdit ? 'Categoria actualizada' : 'Categoria creada',
          detail: isEdit
            ? `${this.formName().trim()} se actualizo correctamente.`
            : `${this.formName().trim()} se creo correctamente.`,
          life: 3000,
        });
        this.saved.emit();
      },
      error: (error) => {
        this.submitting.set(false);
        this.dialogError.set(this.messageForError(error?.error?.code));
      },
    });
  }

  /** Clears validation state and opens the dialog. */
  private resetDialogState(): void {
    this.formSubmitted.set(false);
    this.dialogError.set('');
    this.dialogVisible.set(true);
  }

  /** Converts form values into the API request shape. */
  private toRequest(): CategoryRequest {
    return {
      name: this.formName().trim(),
      parentId: this.formParentId(),
      description: this.formDescription().trim() || undefined,
    };
  }

  /** Maps backend error codes to actionable Spanish copy. */
  private messageForError(code?: string): string {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Revisa los campos obligatorios antes de guardar.',
      NAME_REQUIRED: 'El nombre es obligatorio.',
      PARENT_NOT_FOUND: 'La categoria padre ya no existe.',
      PARENT_INVALID: 'Una categoria no puede ser padre de si misma.',
      CATEGORY_NAME_DUPLICATED: 'Ya existe una categoria con ese nombre en el mismo nivel.',
    };
    return messages[code ?? ''] ?? 'No pudimos guardar la categoria. Intenta nuevamente.';
  }
}
