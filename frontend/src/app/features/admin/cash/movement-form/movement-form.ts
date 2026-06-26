import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { CashService } from '../../../../core/services/cash';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { getApiError } from '../../../../shared/models/api-error';
import {
  CashMovementMethod,
  CashMovementType,
  CreateCashMovementRequest,
} from '../../../../shared/models/cash-session';

import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppControlField } from '../../../../shared/components/app-control-field/app-control-field';
import { AppFormField } from '../../../../shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '../../../../shared/components/app-input-number/app-input-number';
import { AppSelect } from '../../../../shared/components/app-select/app-select';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';

interface Option<T> {
  readonly label: string;
  readonly value: T;
}

const TYPE_OPTIONS: Option<CashMovementType>[] = [
  { label: 'Ingreso', value: 'CASH_IN' },
  { label: 'Egreso', value: 'CASH_OUT' },
  { label: 'Ajuste', value: 'ADJUSTMENT' },
];

const METHOD_OPTIONS: Option<CashMovementMethod>[] = [
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Transferencia', value: 'TRANSFER' },
  { label: 'Otro', value: 'OTHER' },
];

/**
 * Form to register a manual cash movement in an OPEN session.
 *
 * Emits {@code movementAdded} when the backend confirms the creation.
 */
@Component({
  selector: 'app-movement-form',
  imports: [
    AppButton,
    AppControlField,
    AppFormField,
    AppInputNumber,
    AppSelect,
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
    return this.errorMapping.getMessage(apiError.code, apiError.message);
  }
}
