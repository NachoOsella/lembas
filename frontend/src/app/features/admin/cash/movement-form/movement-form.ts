import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { CashService } from '@features/cash/data-access/cash';
import { ErrorMappingService } from '@core/services/error-mapping';
import { getApiError } from '@shared/types/api-error';
import type {
  CashMovementMethod,
  CashMovementType,
  CreateCashMovementRequest,
} from '@features/cash/domain/cash-session';

import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';

/** Visual + semantic description for a movement-type chip. */
interface TypeOption {
  readonly value: CashMovementType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly tone: 'in' | 'out' | 'adjust';
}

/** Visual + semantic description for a method chip. */
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

/**
 * Form to register a manual cash movement in an OPEN session.
 *
 * Uses visual pill selectors (type + method) instead of native dropdowns to
 * keep the cash session workflow fast and reduce friction for the cashier.
 *
 * Emits {@code movementAdded} when the backend confirms the creation.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-movement-form',
  imports: [
    AppButton,
    AppControlField,
    AppFormField,
    AppInputNumber,
    AppToast,
    ErrorAlert,
    FormsModule,
  ],
  templateUrl: './movement-form.html',
  styleUrl: './movement-form.css',
})
export class MovementForm {
  private readonly cashService = inject(CashService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  /** Cash session id the movement belongs to. */
  readonly sessionId = input.required<number>();
  /** When true the form is disabled (session is CLOSED). */
  readonly disabled = input(false);

  /** Emitted after a successful movement creation. */
  readonly movementAdded = output<void>();

  /** Emitted when the user dismisses the form without saving. */
  readonly cancelled = output<void>();

  protected readonly type = signal<CashMovementType | null>(null);
  protected readonly method = signal<CashMovementMethod | null>(null);
  protected readonly amount = signal<number | null>(null);
  protected readonly reason = signal('');
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly canSubmit = computed(
    () =>
      this.type() != null &&
      this.method() != null &&
      this.amount() != null &&
      this.amount() !== 0 &&
      this.reason().trim().length > 0 &&
      !this.saving() &&
      !this.disabled(),
  );

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly methodOptions = METHOD_OPTIONS;

  /** Description of the selected type — drives the contextual hint under amount. */
  protected readonly selectedTypeDescription = computed(() => {
    const selected = this.typeOptions.find((opt) => opt.value === this.type());
    return selected?.description ?? null;
  });

  /** Description of the selected method — drives the contextual hint under amount. */
  protected readonly selectedMethodLabel = computed(() => {
    const selected = this.methodOptions.find((opt) => opt.value === this.method());
    return selected?.label ?? null;
  });

  /** Live preview of the movement, shown when the form has enough data. */
  protected readonly movementPreview = computed(() => {
    const type = this.type();
    const amount = this.amount();
    if (!type || amount == null || amount <= 0) {
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

  protected selectType(value: CashMovementType): void {
    if (this.disabled()) {
      return;
    }
    this.type.set(value);
  }

  protected selectMethod(value: CashMovementMethod): void {
    if (this.disabled()) {
      return;
    }
    this.method.set(value);
  }

  /** Emits the cancelled event so the host can close the modal. */
  protected cancel(): void {
    if (this.saving()) {
      return;
    }
    this.resetForm();
    this.cancelled.emit();
  }

  /** Creates a movement (or negative for CASH_OUT) and resets the form on success. */
  protected submit(): void {
    const type = this.type();
    const method = this.method();
    const amount = this.amount();
    const reason = this.reason().trim();

    if (!type || !method || amount == null || !reason) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);

    const request: CreateCashMovementRequest = {
      type,
      method,
      amount: amount.toFixed(2),
      reason,
    };

    this.cashService.addMovement(this.sessionId(), request).subscribe({
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
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(this.messageForError(err, 'No se pudo registrar el movimiento.'));
      },
    });
  }

  private resetForm(): void {
    this.type.set(null);
    this.method.set(null);
    this.amount.set(null);
    this.reason.set('');
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
    return this.errorMapping.getMessage(apiError.code);
  }
}
