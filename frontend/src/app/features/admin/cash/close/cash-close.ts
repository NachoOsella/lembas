import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CashService } from '../../../../core/services/cash';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { getApiError } from '../../../../shared/models/api-error';
import {
  CashCloseRequestPayload,
  CashEntryDto,
  CashSessionDto,
  CashTotalsByMethod,
} from '../../../../shared/models/cash-session';

import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppControlField } from '../../../../shared/components/app-control-field/app-control-field';
import { AppDataTable } from '../../../../shared/components/app-data-table/app-data-table';
import { AppFormField } from '../../../../shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '../../../../shared/components/app-input-number/app-input-number';
import { AppModal } from '../../../../shared/components/app-modal/app-modal';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppSectionCard } from '../../../../shared/components/app-section-card/app-section-card';
import {
  AppMetricItem,
  AppStatCard,
} from '../../../../shared/components/app-stat-card/app-stat-card';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { FormSection } from '../../../../shared/components/form-section/form-section';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

/** View states for the close page (S3-US08). */
type CloseView = 'form' | 'closed';

const ARS_CURRENCY = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Cash close screen (S3-US08).
 *
 * Loads the OPEN session, shows the close summary (apertura, totales por
 * método, total de movimientos manuales, efectivo esperado), captures the
 * efectivo contado, validates que haya motivo de diferencia cuando es
 * distinta de cero, confirma con un modal y muestra la pantalla de resumen
 * final al cerrar la sesión.
 */
@Component({
  selector: 'app-cash-close',
  imports: [
    AppBadge,
    AppButton,
    AppControlField,
    AppDataTable,
    AppFormField,
    AppInputNumber,
    AppModal,
    AppPageHeader,
    AppSectionCard,
    AppStatCard,
    AppToast,
    ErrorAlert,
    FormSection,
    LoadingSpinner,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './cash-close.html',
  styleUrl: './cash-close.css',
})
export class CashClose implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cashService = inject(CashService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly session = signal<CashSessionDto | null>(null);
  protected readonly entries = signal<CashEntryDto[]>([]);
  protected readonly totalsByMethod = signal<CashTotalsByMethod | null>(null);

  protected readonly countedCashAmount = signal<number | null>(null);
  protected readonly cashDifferenceReason = signal('');
  protected readonly closingNotes = signal('');

  protected readonly confirmDialogVisible = signal(false);
  protected readonly viewState = signal<CloseView>('form');
  protected readonly closedSnapshot = signal<CashSessionDto | null>(null);

  /** Id resolved from the route param; -1 means the route is invalid. */
  private sessionId = -1;

  // ---- derived state ----

  protected readonly opening = computed(() => Number(this.session()?.openingCashAmount ?? 0));

  protected readonly expectedCash = computed(() => {
    const fromBackend = this.session()?.expectedCashAmount;
    if (fromBackend != null && fromBackend !== '') {
      return Number(fromBackend);
    }
    return this.computeExpectedFromEntries();
  });

  protected readonly difference = computed(() => {
    const counted = this.countedCashAmount();
    if (counted == null) {
      return 0;
    }
    return round2(counted - this.expectedCash());
  });

  protected readonly isDifferenceNonZero = computed(
    () => round2(this.difference()) !== 0,
  );

  protected readonly isReasonInvalid = computed(
    () => this.isDifferenceNonZero() && this.cashDifferenceReason().trim() === '',
  );

  protected readonly canSubmit = computed(() => {
    if (this.saving() || this.loading()) {
      return false;
    }
    const counted = this.countedCashAmount();
    if (counted == null || counted < 0) {
      return false;
    }
    if (this.isDifferenceNonZero() && this.cashDifferenceReason().trim() === '') {
      return false;
    }
    return true;
  });

  protected readonly hasEntries = computed(() => this.entries().length > 0);

  protected readonly summaryMetrics = computed<readonly AppMetricItem[]>(() => {
    const totals = this.totalsByMethod();
    return [
      {
        label: 'Apertura',
        value: this.formatCurrency(this.opening()),
        detail: 'Fondo inicial declarado al abrir la caja',
        icon: 'pi pi-flag',
        tone: 'forest',
      },
      {
        label: 'Total movimientos',
        value: this.formatCurrency(this.totalMovementsAmount()),
        detail: this.hasEntries()
          ? `${this.entries().length} entradas registradas`
          : 'Sin movimientos manuales',
        icon: 'pi pi-exchange',
        tone: 'sage',
      },
      {
        label: 'Pagos en efectivo',
        value: this.formatCurrency(this.totalPaymentsAmount()),
        detail:
          totals && totals.paymentsByMethod['CASH']
            ? 'Pagos POS cobrados en efectivo'
            : 'Sin pagos en efectivo',
        icon: 'pi pi-credit-card',
        tone: 'sage',
      },
      {
        label: 'Efectivo esperado',
        value: this.formatCurrency(this.expectedCash()),
        detail: 'Apertura + movimientos + pagos en efectivo',
        icon: 'pi pi-wallet',
        tone: 'forest',
      },
    ];
  });

  protected readonly differenceMetrics = computed<readonly AppMetricItem[]>(() => [
    {
      label: 'Efectivo contado',
      value: this.formatCurrency(this.countedCashAmount() ?? 0),
      detail: 'Monto contado por el cajero',
      icon: 'pi pi-money-bill',
      tone: 'forest',
    },
    {
      label: this.differenceLabel(),
      value: this.formatCurrency(Math.abs(this.difference())),
      detail: this.differenceSubtitle(),
      icon: this.difference() >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down',
      tone: this.difference() === 0 ? 'sage' : this.difference() > 0 ? 'sage' : 'amber',
      trend: this.difference() === 0 ? 'neutral' : this.difference() > 0 ? 'up' : 'down',
    },
  ]);

  protected readonly closedMetrics = computed<readonly AppMetricItem[]>(() => {
    const closed = this.closedSnapshot();
    if (!closed) {
      return [];
    }
    return [
      {
        label: 'Apertura',
        value: this.formatCurrency(this.opening()),
        detail: 'Fondo inicial',
        icon: 'pi pi-flag',
        tone: 'forest',
      },
      {
        label: 'Esperado',
        value: this.formatCurrency(Number(closed.expectedCashAmount ?? this.expectedCash())),
        detail: 'Efectivo esperado al cierre',
        icon: 'pi pi-wallet',
        tone: 'forest',
      },
      {
        label: 'Contado',
        value: this.formatCurrency(Number(closed.countedCashAmount ?? 0)),
        detail: 'Efectivo contado por el cajero',
        icon: 'pi pi-money-bill',
        tone: 'sage',
      },
      {
        label: this.differenceLabel(),
        value: this.formatCurrency(Math.abs(Number(closed.cashDifferenceAmount ?? 0))),
        detail: closed.cashDifferenceReason ?? 'Sin diferencia',
        icon: 'pi pi-chart-line',
        tone: Number(closed.cashDifferenceAmount ?? 0) === 0 ? 'sage' : 'amber',
      },
    ];
  });

  protected readonly entriesColumns = [
    { field: 'kind', header: 'Origen' },
    { field: 'type', header: 'Tipo' },
    { field: 'method', header: 'Metodo' },
    { field: 'amount', header: 'Monto' },
    { field: 'description', header: 'Detalle' },
    { field: 'registeredBy', header: 'Registrado por' },
    { field: 'occurredAt', header: 'Fecha' },
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('sessionId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de caja invalido.');
      return;
    }
    this.sessionId = id;
    this.loadSession(id);
  }

  private loadSession(id: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cashService.getById(id).subscribe({
      next: (session) => {
        if (session.status === 'CLOSED') {
          this.messageService.add({
            severity: 'info',
            summary: 'Caja ya cerrada',
            detail: 'La sesion seleccionada ya fue cerrada.',
          });
          void this.router.navigate(['/admin/cash', session.id]);
          return;
        }
        this.session.set(session);
        this.entries.set(session.entries ?? []);
        this.totalsByMethod.set(session.totalsByMethod ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageForError(err, 'No se pudo cargar la caja.'));
      },
    });
  }

  /** Opens the confirmation modal after client-side validation passes. */
  protected openConfirm(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.confirmDialogVisible.set(true);
  }

  /** Closes the confirmation modal without submitting. */
  protected closeConfirm(): void {
    if (this.saving()) {
      return;
    }
    this.confirmDialogVisible.set(false);
  }

  /** Submits the close request after the user confirms the modal. */
  protected confirmClose(): void {
    if (!this.canSubmit()) {
      return;
    }
    const counted = this.countedCashAmount() ?? 0;
    const request: CashCloseRequestPayload = {
      countedCashAmount: counted.toFixed(2),
      closingNotes: this.closingNotes().trim() || null,
      cashDifferenceReason:
        this.isDifferenceNonZero() ? this.cashDifferenceReason().trim() : null,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.cashService.closeSession(this.sessionId, request).subscribe({
      next: (closed) => {
        this.saving.set(false);
        this.confirmDialogVisible.set(false);
        this.closedSnapshot.set(closed);
        this.viewState.set('closed');
        this.messageService.add({
          severity: 'success',
          summary: 'Caja cerrada',
          detail: 'El cierre de caja fue registrado correctamente.',
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(this.messageForError(err, 'No se pudo cerrar la caja.'));
      },
    });
  }

  /** Cancels and navigates back to the cash detail. */
  protected cancel(): void {
    if (this.saving()) {
      return;
    }
    void this.router.navigate(['/admin/cash', this.sessionId]);
  }

  /** Navigates to the detail page from the final summary. */
  protected viewDetail(): void {
    const id = this.closedSnapshot()?.id ?? this.sessionId;
    void this.router.navigate(['/admin/cash', id]);
  }

  /** Navigates back to the cash landing. */
  protected goToLanding(): void {
    void this.router.navigate(['/admin/cash']);
  }

  /** Total amount of manual movements for the summary metric. */
  private totalMovementsAmount(): number {
    return this.entries()
      .filter((entry) => entry.kind === 'MANUAL')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
  }

  /** Total amount of APPROVED payments across all methods. */
  private totalPaymentsAmount(): number {
    const totals = this.totalsByMethod();
    if (totals) {
      return Object.values(totals.paymentsByMethod).reduce(
        (sum, value) => sum + Number(value),
        0,
      );
    }
    return this.entries()
      .filter((entry) => entry.kind === 'PAYMENT')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
  }

  /** Computes the expected cash from the entries timeline when the backend
   *  does not provide it (e.g. when the session is still OPEN). */
  private computeExpectedFromEntries(): number {
    const opening = this.opening();
    const cashIn = this.entries()
      .filter((entry) => entry.method === 'CASH' && entry.direction === 'IN')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const cashOut = this.entries()
      .filter((entry) => entry.method === 'CASH' && entry.direction === 'OUT')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const cashAdjust = this.entries()
      .filter((entry) => entry.method === 'CASH' && entry.direction === 'NEUTRAL')
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    return opening + cashIn - cashOut + cashAdjust;
  }

  /** Returns "Sobrante", "Faltante" or "Cuadra exacto" depending on the sign. */
  private differenceLabel(): string {
    const diff = this.difference();
    if (diff === 0) {
      return 'Cuadra exacto';
    }
    return diff > 0 ? 'Sobrante' : 'Faltante';
  }

  /** Subtitle that explains the difference metric in the UI. */
  private differenceSubtitle(): string {
    const diff = this.difference();
    if (diff === 0) {
      return 'El efectivo contado coincide con el esperado';
    }
    if (this.isReasonInvalid()) {
      return 'Indica el motivo del sobrante o faltante';
    }
    return diff > 0 ? 'Hay mas efectivo del esperado' : 'Hay menos efectivo del esperado';
  }

  /** Localized label for the entry type or kind. */
  protected movementLabel(entry: CashEntryDto): string {
    if (entry.kind === 'PAYMENT') {
      return 'Pago';
    }
    switch (entry.type) {
      case 'CASH_IN':
        return 'Ingreso';
      case 'CASH_OUT':
        return 'Egreso';
      case 'ADJUSTMENT':
        return 'Ajuste';
      default:
        return entry.type;
    }
  }

  /** Pill label for the entry kind (Manual / Caja). */
  protected kindLabel(kind: CashEntryDto['kind']): string {
    return kind === 'PAYMENT' ? 'Caja' : 'Manual';
  }

  /** Localized label for the entry method. */
  protected methodLabel(method: string | null): string {
    if (!method) {
      return '—';
    }
    switch (method) {
      case 'CASH':
        return 'Efectivo';
      case 'TRANSFER':
        return 'Transferencia';
      case 'OTHER':
        return 'Otro';
      case 'QR':
        return 'QR';
      case 'DEBIT_CARD':
        return 'Tarjeta de débito';
      case 'CREDIT_CARD':
        return 'Tarjeta de crédito';
      case 'CHECKOUT_PRO':
        return 'Mercado Pago';
      default:
        return method;
    }
  }

  /** Tone class for the amount cell. */
  protected movementAmountClass(entry: CashEntryDto): string {
    if (entry.direction === 'IN') {
      return 'cash-close__amount--in';
    }
    if (entry.direction === 'OUT') {
      return 'cash-close__amount--out';
    }
    return 'cash-close__amount--adjust';
  }

  /** Sign prefix for the amount cell. */
  protected movementSign(direction: CashEntryDto['direction']): string {
    if (direction === 'IN') {
      return '+';
    }
    if (direction === 'OUT') {
      return '-';
    }
    return '±';
  }

  /** Maps backend API errors to Spanish copy. */
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

  /** Formats a number as ARS currency (es-AR locale), no decimals. */
  private formatCurrency(value: number): string {
    return ARS_CURRENCY.format(value);
  }
}

/** Rounds a number to 2 decimals with HALF_UP semantics to avoid -0.00. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
