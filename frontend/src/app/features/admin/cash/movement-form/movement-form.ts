import {
  DestroyRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, required, submit, validate } from '@angular/forms/signals';
import { MessageService } from 'primeng/api';

import { CashService } from '@features/cash/data-access/cash';
import {
  isCashMovementFormValid,
  parseCashAmount,
  toCashMovementRequest,
} from '@features/cash/domain/cash-forms';
import type { CashMovementFormModel } from '@features/cash/domain/cash-forms';
import type { CashMovementMethod, CashMovementType } from '@features/cash/domain/cash-session';
import { ErrorMappingService } from '@core/services/error-mapping';
import { getApiError } from '@shared/types/api-error';

import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';

interface TypeOption {
  readonly value: CashMovementType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly tone: 'in' | 'out' | 'adjust';
}

interface MethodOption {
  readonly value: CashMovementMethod;
  readonly label: string;
  readonly icon: string;
}

const TYPE_OPTIONS: ReadonlyArray<TypeOption> = [
  {
    value: 'CASH_IN',
    label: 'Ingreso',
    description: 'Suma al fondo de la caja',
    icon: 'pi pi-arrow-down',
    tone: 'in',
  },
  {
    value: 'CASH_OUT',
    label: 'Egreso',
    description: 'Retira efectivo de la caja',
    icon: 'pi pi-arrow-up',
    tone: 'out',
  },
  {
    value: 'ADJUSTMENT',
    label: 'Ajuste',
    description: 'Correccion manual con motivo',
    icon: 'pi pi-sliders-h',
    tone: 'adjust',
  },
];

const METHOD_OPTIONS: ReadonlyArray<MethodOption> = [
  { value: 'CASH', label: 'Efectivo', icon: 'pi pi-money-bill' },
  { value: 'TRANSFER', label: 'Transferencia', icon: 'pi pi-receipt' },
  { value: 'OTHER', label: 'Otro', icon: 'pi pi-ellipsis-h' },
];

/** Presentational movement form with a typed signal-form model and command state. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-movement-form',
  imports: [AppButton, AppControlField, AppFormField, AppInputNumber, AppToast, ErrorAlert],
  templateUrl: './movement-form.html',
  styleUrl: './movement-form.css',
})
export class MovementForm {
  private readonly cashService = inject(CashService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sessionId = input.required<number>();
  readonly disabled = input(false);
  readonly movementAdded = output<void>();
  readonly cancelled = output<void>();

  protected readonly model = signal<CashMovementFormModel>({
    type: '',
    method: '',
    amount: '',
    reason: '',
  });
  protected readonly movementForm = form(this.model, (schema) => {
    required(schema.type, { message: 'Selecciona el tipo de movimiento.' });
    validate(schema.type, ({ value }) =>
      value() === ''
        ? { kind: 'missingType', message: 'Selecciona el tipo de movimiento.' }
        : undefined,
    );
    required(schema.method, { message: 'Selecciona el metodo.' });
    validate(schema.method, ({ value }) =>
      value() === '' ? { kind: 'missingMethod', message: 'Selecciona el metodo.' } : undefined,
    );
    required(schema.amount, { message: 'El monto es obligatorio.' });
    validate(schema.amount, ({ value }) => {
      const amount = parseCashAmount(value());
      return amount !== null && amount !== 0
        ? undefined
        : { kind: 'invalidAmount', message: 'El monto debe ser distinto de cero.' };
    });
    required(schema.reason, { message: 'El motivo es obligatorio.' });
  });

  protected readonly type = computed(() => (this.model().type === '' ? null : this.model().type));
  protected readonly method = computed(() =>
    this.model().method === '' ? null : this.model().method,
  );
  protected readonly amount = computed(() => parseCashAmount(this.model().amount));
  protected readonly reason = computed(() => this.model().reason);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly methodOptions = METHOD_OPTIONS;
  protected readonly canSubmit = computed(
    () =>
      !this.disabled() &&
      !this.saving() &&
      this.movementForm().valid() &&
      isCashMovementFormValid(this.model()),
  );
  protected readonly selectedTypeDescription = computed(() => {
    const selected = this.typeOptions.find((option) => option.value === this.type());
    return selected?.description ?? null;
  });
  protected readonly selectedMethodLabel = computed(() => {
    const selected = this.methodOptions.find((option) => option.value === this.method());
    return selected?.label ?? null;
  });
  protected readonly movementPreview = computed(() => {
    const type = this.type();
    const amount = this.amount();
    if (!type || amount === null || amount <= 0) {
      return null;
    }
    const sign = type === 'CASH_IN' ? '+' : type === 'CASH_OUT' ? '-' : '±';
    const formatted = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
    return `${sign} ${formatted}`;
  });

  protected selectType(type: CashMovementType): void {
    if (!this.disabled()) {
      this.model.update((value) => ({ ...value, type }));
    }
  }

  protected selectMethod(method: CashMovementMethod): void {
    if (!this.disabled()) {
      this.model.update((value) => ({ ...value, method }));
    }
  }

  protected setAmount(amount: number | null): void {
    this.model.update((value) => ({ ...value, amount: amount === null ? '' : String(amount) }));
  }

  protected setReason(reason: string): void {
    this.model.update((value) => ({ ...value, reason }));
  }

  protected cancel(): void {
    if (this.saving()) {
      return;
    }
    this.resetForm();
    this.cancelled.emit();
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      return;
    }

    submit(this.movementForm, async () => {
      const request = toCashMovementRequest(this.model());
      if (!request) {
        return;
      }
      this.saving.set(true);
      this.errorMessage.set(null);
      this.cashService
        .addMovement(this.sessionId(), request)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.resetForm();
            this.messageService.add({
              severity: 'success',
              summary: 'Movimiento registrado',
              detail: 'El movimiento de caja fue registrado correctamente.',
            });
            this.movementAdded.emit();
          },
          error: (error: unknown) => {
            this.saving.set(false);
            this.errorMessage.set(
              this.messageForError(error, 'No se pudo registrar el movimiento.'),
            );
          },
        });
    });
  }

  private resetForm(): void {
    this.model.set({ type: '', method: '', amount: '', reason: '' });
    this.errorMessage.set(null);
  }

  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    if (!apiError) {
      return fallback;
    }
    if (apiError.code === 'VALIDATION_ERROR') {
      return this.errorMapping.formatValidationErrors(apiError);
    }
    return this.errorMapping.getMessage(apiError.code, fallback);
  }
}
