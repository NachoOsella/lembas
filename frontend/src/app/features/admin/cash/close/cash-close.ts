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
import {
  AppMetricItem,
  AppStatCard,
} from '../../../../shared/components/app-stat-card/app-stat-card';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { FormSection } from '../../../../shared/components/form-section/form-section';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import {
  CASH_ENTRY_COLUMNS,
  cashEntryAmountModifier,
  cashEntryKindLabel,
  cashEntryKindTone,
  cashEntryLabel,
  cashEntryMethodLabel,
  cashEntrySign,
  cashEntryTypeTone,
} from '../shared/cash-entry-display';
import { SeverityPill } from '../../../../shared/components/severity-pill/severity-pill';

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
    AppStatCard,
    AppToast,
    ErrorAlert,
    FormSection,
    LoadingSpinner,
    SeverityPill,
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
    const net = this.netMovementsEffect();
    return [
      {
        label: 'Apertura',
        value: this.formatCurrency(this.opening()),
        detail: 'Fondo inicial declarado al abrir la caja',
        icon: 'pi pi-flag',
        tone: 'forest',
      },
      {
        label: 'Efectivo en movimientos',
        value: this.formatSignedCurrency(net),
        detail: this.movementsDetail(),
        icon: 'pi pi-exchange',
        tone: net === 0 ? 'sage' : net > 0 ? 'sage' : 'amber',
        trend: net === 0 ? 'neutral' : net > 0 ? 'up' : 'down',
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

  protected readonly entriesColumns = CASH_ENTRY_COLUMNS;

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

  /**
   * Header-level shortcut: scrolls the user to the arqueo form and focuses
   * the counted-cash input. Used by the always-visible "Cerrar caja" button
   * in the page header so the user does not have to scroll to find the
   * submit action.
   */
  protected scrollToArqueo(): void {
    const target = document.getElementById('cash-close-arqueo');
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const input = target.querySelector('input');
      if (input instanceof HTMLElement) {
        // Defer to let the smooth scroll start.
        setTimeout(() => input.focus(), 250);
      }
    }
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
      next: () => {
        this.saving.set(false);
        this.confirmDialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Caja cerrada',
          detail: 'El cierre de caja fue registrado correctamente.',
        });
        // Redirect straight to the open form so the user can start a new
        // session without seeing the closed (read-only) detail screen.
        void this.router.navigate(['/admin/cash/open']);
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

  /**
   * Net cash effect of all manual movements (CASH-method only, matching the
   * expected-cash rule). Positive means the movements put more cash in the
   * drawer; negative means they took cash out. Adjustments (NEUTRAL) keep
   * their sign as entered by the operator.
   */
  private netMovementsEffect(): number {
    return this.entries()
      .filter((entry) => entry.kind === 'MANUAL' && entry.method === 'CASH')
      .reduce((sum, entry) => {
        const amount = Number(entry.amount);
        if (entry.direction === 'IN') {
          return sum + Math.abs(amount);
        }
        if (entry.direction === 'OUT') {
          return sum - Math.abs(amount);
        }
        // NEUTRAL (adjustment): signed value, operator-entered.
        return sum + amount;
      }, 0);
  }

  /**
   * Detail string for the movements metric: summarizes how many CASH IN/OUT
   * movements were registered and flags non-cash movements as informational.
   */
  private movementsDetail(): string {
    const manual = this.entries().filter((entry) => entry.kind === 'MANUAL');
    if (manual.length === 0) {
      return 'Sin movimientos manuales';
    }
    const cashIn = manual.filter((e) => e.method === 'CASH' && e.direction === 'IN').length;
    const cashOut = manual.filter((e) => e.method === 'CASH' && e.direction === 'OUT').length;
    const nonCash = manual.length - cashIn - cashOut;
    const parts: string[] = [];
    if (cashIn > 0) {
      parts.push(`${cashIn} ingreso${cashIn > 1 ? 's' : ''}`);
    }
    if (cashOut > 0) {
      parts.push(`${cashOut} egreso${cashOut > 1 ? 's' : ''}`);
    }
    const summary = parts.length > 0 ? parts.join(' + ') : 'Solo ajustes';
    return nonCash > 0 ? `${summary} (${nonCash} informacional)` : summary;
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
    return cashEntryLabel(entry);
  }

  /** Severity tone for the entry type pill. */
  protected movementTone(entry: CashEntryDto) {
    return cashEntryTypeTone(entry);
  }

  /** Pill label for the entry kind (Manual / Caja). */
  protected kindLabel(kind: CashEntryDto['kind']): string {
    return cashEntryKindLabel(kind);
  }

  /** Severity tone for the kind pill (Manual = success, Caja = warn). */
  protected kindTone(kind: CashEntryDto['kind']) {
    return cashEntryKindTone(kind);
  }

  /** Localized label for the entry method. */
  protected methodLabel(method: string | null): string {
    return cashEntryMethodLabel(method);
  }

  /** Tone class for the amount cell. */
  protected movementAmountClass(entry: CashEntryDto): string {
    return `cash-close__amount--${cashEntryAmountModifier(entry.direction)}`;
  }

  /** Sign prefix for the amount cell. */
  protected movementSign(direction: CashEntryDto['direction']): string {
    return cashEntrySign(direction);
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

  /** Formats a number as ARS currency with an explicit sign prefix so the
   *  movements metric shows direction at a glance. */
  private formatSignedCurrency(value: number): string {
    if (value === 0) {
      return ARS_CURRENCY.format(0);
    }
    const sign = value > 0 ? '+' : '−';
    return `${sign} ${ARS_CURRENCY.format(Math.abs(value))}`;
  }
}

/** Rounds a number to 2 decimals with HALF_UP semantics to avoid -0.00. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
