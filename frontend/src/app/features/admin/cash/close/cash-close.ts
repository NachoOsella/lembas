import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import type { OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, required, submit, validate } from '@angular/forms/signals';
import { MessageService } from 'primeng/api';

import { CashClosePageStore } from '../state/cash-close-page.store';
import {
  calculateCashDifference,
  calculateExpectedCash,
  calculateManualCashEffect,
  cashDifferenceDescription,
  cashDifferenceLabel,
  formatCashAmount,
  formatSignedCashAmount,
  totalByMethod,
} from '@features/cash/public-api';
import {
  isCashCloseFormValid,
  isCountedCashAmountValid,
  parseCashAmount,
  toCashCloseRequest,
} from '@features/cash/domain/cash-forms';
import type { CashCloseFormModel } from '@features/cash/domain/cash-forms';
import type { CashEntryDto } from '@features/cash/domain/cash-session';

import { AppBadge } from '@shared/components/app-badge/app-badge';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppModal } from '@shared/components/app-modal/app-modal';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import type { AppMetricItem } from '@shared/components/app-stat-card/app-stat-card';
import { AppStatCard } from '@shared/components/app-stat-card/app-stat-card';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { FormSection } from '@shared/components/form-section/form-section';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import { SeverityPill } from '@shared/components/severity-pill/severity-pill';
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

/** Cash close page: physical-cash calculation, typed close form, and command confirmation. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    EmptyState,
    FormSection,
    LoadingSpinner,
    SeverityPill,
    CurrencyPipe,
    DatePipe,
  ],
  providers: [CashClosePageStore],
  templateUrl: './cash-close.html',
  styleUrl: './cash-close.css',
})
export class CashClose implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly store = inject(CashClosePageStore);

  protected readonly loading = this.store.loading;
  protected readonly saving = this.store.saving;
  protected readonly errorMessage = this.store.errorMessage;
  protected readonly session = this.store.session;
  protected readonly entries = this.store.entries;
  protected readonly totalsByMethod = this.store.totalsByMethod;
  protected readonly confirmDialogVisible = signal(false);

  protected readonly closeModel = signal<CashCloseFormModel>({
    countedCashAmount: '',
    cashDifferenceReason: '',
    closingNotes: '',
  });
  protected readonly closeForm = form(this.closeModel, (schema) => {
    required(schema.countedCashAmount, { message: 'El efectivo contado es obligatorio.' });
    validate(schema.countedCashAmount, ({ value }) =>
      isCountedCashAmountValid(value())
        ? undefined
        : { kind: 'invalidAmount', message: 'Ingresa un monto contado valido.' },
    );
  });

  private sessionId = -1;

  protected readonly countedCashAmount = computed(() =>
    parseCashAmount(this.closeModel().countedCashAmount),
  );
  protected readonly cashDifferenceReason = computed(() => this.closeModel().cashDifferenceReason);
  protected readonly closingNotes = computed(() => this.closeModel().closingNotes);
  protected readonly opening = computed(() => Number(this.session()?.openingCashAmount ?? 0));
  protected readonly expectedCash = computed(() => {
    const backendExpected = this.session()?.expectedCashAmount;
    return backendExpected !== null && backendExpected !== undefined && backendExpected !== ''
      ? Number(backendExpected)
      : calculateExpectedCash(this.session()?.openingCashAmount, this.entries());
  });
  protected readonly difference = computed(() =>
    calculateCashDifference(this.countedCashAmount(), this.expectedCash()),
  );
  protected readonly isDifferenceNonZero = computed(() => this.difference() !== 0);
  protected readonly netMovementsEffect = computed(() => calculateManualCashEffect(this.entries()));
  protected readonly isReasonInvalid = computed(
    () => this.isDifferenceNonZero() && this.cashDifferenceReason().trim() === '',
  );
  protected readonly canSubmit = computed(
    () =>
      !this.loading() &&
      !this.saving() &&
      this.closeForm().valid() &&
      isCashCloseFormValid(this.closeModel(), this.expectedCash()),
  );
  protected readonly hasEntries = computed(() => this.entries().length > 0);

  protected readonly summaryMetrics = computed<readonly AppMetricItem[]>(() => {
    const net = calculateManualCashEffect(this.entries());
    const cashPayments = this.totalPaymentsAmount();
    return [
      {
        label: 'Apertura',
        value: formatCashAmount(this.opening()),
        detail: 'Fondo inicial declarado al abrir la caja',
        icon: 'pi pi-flag',
        tone: 'forest',
      },
      {
        label: 'Efectivo en movimientos',
        value: formatSignedCashAmount(net),
        detail: this.movementsDetail(),
        icon: 'pi pi-exchange',
        tone: net === 0 ? 'sage' : net > 0 ? 'sage' : 'amber',
        trend: net === 0 ? 'neutral' : net > 0 ? 'up' : 'down',
      },
      {
        label: 'Pagos en efectivo',
        value: formatCashAmount(cashPayments),
        detail: cashPayments > 0 ? 'Pagos POS que afectan el cajon' : 'Sin pagos en efectivo',
        icon: 'pi pi-credit-card',
        tone: 'sage',
      },
      {
        label: 'Efectivo esperado',
        value: formatCashAmount(this.expectedCash()),
        detail: 'Apertura + movimientos + pagos en efectivo',
        icon: 'pi pi-wallet',
        tone: 'forest',
      },
    ];
  });

  protected readonly differenceMetrics = computed<readonly AppMetricItem[]>(() => [
    {
      label: 'Efectivo contado',
      value: formatCashAmount(this.countedCashAmount() ?? 0),
      detail: 'Monto contado por el cajero',
      icon: 'pi pi-money-bill',
      tone: 'forest',
    },
    {
      label: cashDifferenceLabel(this.difference()),
      value: formatCashAmount(Math.abs(this.difference())),
      detail: cashDifferenceDescription(this.difference(), this.isReasonInvalid()),
      icon: this.difference() >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down',
      tone: this.difference() === 0 ? 'sage' : this.difference() > 0 ? 'sage' : 'amber',
      trend: this.difference() === 0 ? 'neutral' : this.difference() > 0 ? 'up' : 'down',
    },
  ]);

  protected readonly entriesColumns = CASH_ENTRY_COLUMNS;

  constructor() {
    effect(() => {
      const closedSession = this.store.closedSession();
      if (closedSession) {
        this.confirmDialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Caja cerrada',
          detail: 'El cierre de caja fue registrado correctamente.',
        });
        void this.router.navigate(['/admin/cash/open']);
        return;
      }

      const session = this.session();
      if (session?.status === 'CLOSED') {
        this.messageService.add({
          severity: 'info',
          summary: 'Caja ya cerrada',
          detail: 'La sesion seleccionada ya fue cerrada.',
        });
        void this.router.navigate(['/admin/cash', session.id]);
      }
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('sessionId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.store.setInvalidRouteError('Identificador de caja invalido.');
      return;
    }
    this.sessionId = id;
    this.store.load(id);
  }

  protected retry(): void {
    this.store.refresh();
  }

  protected setCountedCashAmount(amount: number | null): void {
    this.closeModel.update((model) => ({
      ...model,
      countedCashAmount: amount === null ? '' : String(amount),
    }));
  }

  protected setCashDifferenceReason(reason: string): void {
    this.closeModel.update((model) => ({ ...model, cashDifferenceReason: reason }));
  }

  protected setClosingNotes(notes: string): void {
    this.closeModel.update((model) => ({ ...model, closingNotes: notes }));
  }

  protected openConfirm(): void {
    if (!this.canSubmit()) {
      return;
    }
    submit(this.closeForm, async () => {
      if (this.canSubmit()) {
        this.confirmDialogVisible.set(true);
      }
    });
  }

  protected scrollToArqueo(): void {
    const target = document.getElementById('cash-close-arqueo');
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const input = target.querySelector('input');
      if (input instanceof HTMLElement) {
        setTimeout(() => input.focus(), 250);
      }
    }
  }

  protected closeConfirm(): void {
    if (!this.saving()) {
      this.confirmDialogVisible.set(false);
    }
  }

  protected confirmClose(): void {
    if (!this.canSubmit()) {
      return;
    }
    const request = toCashCloseRequest(this.closeModel(), this.expectedCash());
    if (!request) {
      return;
    }
    this.store.closeSession(request);
  }

  protected cancel(): void {
    if (!this.saving()) {
      void this.router.navigate(['/admin/cash', this.sessionId]);
    }
  }

  protected movementLabel(entry: CashEntryDto): string {
    return cashEntryLabel(entry);
  }

  protected movementTone(entry: CashEntryDto) {
    return cashEntryTypeTone(entry);
  }

  protected kindLabel(kind: CashEntryDto['kind']): string {
    return cashEntryKindLabel(kind);
  }

  protected kindTone(kind: CashEntryDto['kind']) {
    return cashEntryKindTone(kind);
  }

  protected methodLabel(method: string | null): string {
    return cashEntryMethodLabel(method);
  }

  protected movementAmountClass(entry: CashEntryDto): string {
    return `cash-close__amount--${cashEntryAmountModifier(entry.direction)}`;
  }

  protected movementSign(direction: CashEntryDto['direction']): string {
    return cashEntrySign(direction);
  }

  private movementsDetail(): string {
    const manual = this.entries().filter((entry) => entry.kind === 'MANUAL');
    if (manual.length === 0) {
      return 'Sin movimientos manuales';
    }
    const cashIn = manual.filter(
      (entry) => entry.method === 'CASH' && entry.direction === 'IN',
    ).length;
    const cashOut = manual.filter(
      (entry) => entry.method === 'CASH' && entry.direction === 'OUT',
    ).length;
    const informational = manual.length - cashIn - cashOut;
    const parts: string[] = [];
    if (cashIn > 0) {
      parts.push(`${cashIn} ingreso${cashIn > 1 ? 's' : ''}`);
    }
    if (cashOut > 0) {
      parts.push(`${cashOut} egreso${cashOut > 1 ? 's' : ''}`);
    }
    const summary = parts.length > 0 ? parts.join(' + ') : 'Solo ajustes';
    return informational > 0 ? `${summary} (${informational} informacional)` : summary;
  }

  private totalPaymentsAmount(): number {
    const totals = this.totalsByMethod();
    if (totals) {
      return totalByMethod(totals.paymentsByMethod, 'CASH');
    }
    return this.entries()
      .filter((entry) => entry.kind === 'PAYMENT' && entry.method === 'CASH')
      .reduce((sum, entry) => sum + Math.abs(Number(entry.amount)), 0);
  }
}
