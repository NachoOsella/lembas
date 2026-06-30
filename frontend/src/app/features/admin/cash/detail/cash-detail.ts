import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';

import { CashService } from '../../../../core/services/cash';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { getApiError } from '../../../../shared/models/api-error';
import {
  CashSessionDto,
  CashEntryDto,
  CashSessionStatus,
} from '../../../../shared/models/cash-session';

import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppDataTable } from '../../../../shared/components/app-data-table/app-data-table';
import { AppModal } from '../../../../shared/components/app-modal/app-modal';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppSectionCard } from '../../../../shared/components/app-section-card/app-section-card';
import {
  AppStatCard,
  AppMetricItem,
} from '../../../../shared/components/app-stat-card/app-stat-card';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { MovementForm } from '../movement-form/movement-form';
import { SeverityPill } from '../../../../shared/components/severity-pill/severity-pill';
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

/** Badge configuration for the OPEN/CLOSED session status. */
interface SessionBadgeConfig {
  readonly label: string;
  readonly tone: 'success' | 'neutral';
  readonly icon: string;
}

const SESSION_STATUS_BADGES: Record<CashSessionStatus, SessionBadgeConfig> = {
  OPEN: { label: 'Sesion abierta', tone: 'success', icon: 'pi pi-check-circle' },
  CLOSED: { label: 'Sesion cerrada', tone: 'neutral', icon: 'pi pi-lock' },
};

/**
 * Cash detail screen with movements table and movement form (S3-US07).
 *
 * Surfaces a financial summary hero (opening amount, in/out movements,
 * expected cash), the session metadata, the movements table, and the
 * manual-movement form for OPEN sessions.
 */
@Component({
  selector: 'app-cash-detail',
  imports: [
    AppBadge,
    AppButton,
    AppDataTable,
    AppModal,
    AppPageHeader,
    AppSectionCard,
    AppStatCard,
    AppToast,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    MovementForm,
    SeverityPill,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './cash-detail.html',
  styleUrl: './cash-detail.css',
})
export class CashDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cashService = inject(CashService);
  private readonly errorMapping = inject(ErrorMappingService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly session = signal<CashSessionDto | null>(null);
  protected readonly entries = signal<CashEntryDto[]>([]);

  /** Whether the "nuevo movimiento manual" modal is visible. */
  protected readonly movementDialogVisible = signal(false);

  /** Status badge config consumed by the page header. */
  protected readonly statusBadges = SESSION_STATUS_BADGES;

  /** Computed totals for the financial summary hero. */
  protected readonly totalIn = computed(() =>
    this.entries()
      .filter((m) => m.direction === 'IN')
      .reduce((sum, m) => sum + Number(m.amount), 0),
  );

  protected readonly totalOut = computed(() =>
    this.entries()
      .filter((m) => m.direction === 'OUT')
      .reduce((sum, m) => sum + Number(m.amount), 0),
  );

  protected readonly totalAdjustments = computed(() =>
    this.entries()
      .filter((m) => m.direction === 'NEUTRAL')
      .reduce((sum, m) => sum + Number(m.amount), 0),
  );

  /**
   * Net total of every movement through the session (any payment method).
   * Excludes the opening amount so the two stats serve different purposes:
   * - {@code totalMovements} answers "how much activity went through the
   *   drawer", including QR / transfers / card.
   * - {@code cashInDrawer} answers "how much physical cash should be
   *   sitting in the drawer right now".
   */
  protected readonly totalMovements = computed(
    () => this.totalIn() - this.totalOut() + this.totalAdjustments(),
  );

  /**
   * Physical cash that should be in the drawer.
   * Only CASH-method entries affect the bill count; transfers/cards/QR are
   * tracked as informational at close. Net = opening + cash IN - cash OUT
   * + cash neutral adjustments.
   */
  protected readonly cashInDrawer = computed(() => {
    const opening = Number(this.session()?.openingCashAmount ?? 0);
    const cashIn = this.entries()
      .filter((m) => m.method === 'CASH' && m.direction === 'IN')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const cashOut = this.entries()
      .filter((m) => m.method === 'CASH' && m.direction === 'OUT')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const cashAdjust = this.entries()
      .filter((m) => m.method === 'CASH' && m.direction === 'NEUTRAL')
      .reduce((sum, m) => sum + Number(m.amount), 0);
    return opening + cashIn - cashOut + cashAdjust;
  });

  /** Count of cash-method entries for the cash-in-drawer metric detail. */
  protected readonly cashMovementsCount = computed(
    () => this.entries().filter((m) => m.method === 'CASH').length,
  );

  /** Count of entries for the section eyebrow. */
  protected readonly movementsCount = computed(() => this.entries().length);

  /** Financial summary stat-card items for the hero. */
  protected readonly summaryMetrics = computed<readonly AppMetricItem[]>(() => [
    {
      label: 'Apertura',
      value: this.formatCurrency(Number(this.session()?.openingCashAmount ?? 0)),
      detail: 'Fondo inicial de la sesion',
      icon: 'pi pi-flag',
      tone: 'forest',
    },
    {
      label: 'Ingresos',
      value: this.formatCurrency(this.totalIn()),
      detail: this.totalIn() > 0 ? 'Movimientos y pagos en caja' : 'Sin ingresos registrados',
      icon: 'pi pi-arrow-down',
      tone: 'sage',
      trend: this.totalIn() > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Egresos',
      value: this.formatCurrency(this.totalOut()),
      detail: this.totalOut() > 0 ? 'Retiros manuales de caja' : 'Sin egresos registrados',
      icon: 'pi pi-arrow-up',
      tone: 'amber',
      trend: this.totalOut() > 0 ? 'down' : 'neutral',
    },
    {
      label: 'Total movimientos',
      value: this.formatCurrency(this.totalMovements()),
      detail:
        this.movementsCount() > 0
          ? `Neto de todos los movimientos (${this.movementsCount()})`
          : 'Sin movimientos registrados',
      icon: 'pi pi-chart-line',
      tone: 'forest',
    },
    {
      label: 'Efectivo en caja',
      value: this.formatCurrency(this.cashInDrawer()),
      detail:
        this.cashMovementsCount() > 0
          ? `Solo movimientos en efectivo (${this.cashMovementsCount()})`
          : 'Solo el fondo inicial, en billetes',
      icon: 'pi pi-money-bill',
      tone: 'sage',
    },
  ]);

  /** Data-table column definition for the unified entries list. */
  protected readonly entriesColumns = CASH_ENTRY_COLUMNS;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de caja invalido.');
      return;
    }
    this.loadSession(id);
  }

  private loadSession(id: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cashService.getById(id).subscribe({
      next: (session) => {
        this.session.set(session);
        this.entries.set(session.entries ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const apiError = getApiError(err);
        this.errorMessage.set(
          apiError
            ? this.errorMapping.getMessage(apiError.code, apiError.message)
            : 'No se pudo cargar la caja.',
        );
      },
    });
  }

  /** Reloads the session after a movement is added. */
  protected onMovementAdded(): void {
    const id = this.session()?.id;
    if (id != null) {
      this.movementDialogVisible.set(false);
      this.loadSession(id);
    }
  }

  /** Opens the "nuevo movimiento manual" modal. */
  protected openMovementDialog(): void {
    if (this.isClosed) {
      return;
    }
    this.movementDialogVisible.set(true);
  }

  /** Navigates to the close-cash screen for the current session. */
  protected goToClose(): void {
    const id = this.session()?.id;
    if (id == null) {
      return;
    }
    void this.router.navigate(['/admin/cash/close', id]);
  }

  /** Closes the movement dialog without saving. */
  protected closeMovementDialog(): void {
    this.movementDialogVisible.set(false);
  }

  /** Tone for the entry type pill. */
  protected movementTone(entry: CashEntryDto) {
    return cashEntryTypeTone(entry);
  }

  /** Localized label for the entry type or kind. */
  protected movementLabel(entry: CashEntryDto): string {
    return cashEntryLabel(entry);
  }

  /** Pill label for the entry kind (Manual / Caja). */
  protected kindLabel(kind: CashEntryDto['kind']): string {
    return cashEntryKindLabel(kind);
  }

  /** Tone for the kind pill (Manual = success, Caja = warn). */
  protected kindTone(kind: CashEntryDto['kind']) {
    return cashEntryKindTone(kind);
  }

  /** Localized label for the entry method (manual or payment). */
  protected methodLabel(method: string | null): string {
    return cashEntryMethodLabel(method);
  }

  /** Sign prefix to display in the amount cell. */
  protected movementSign(direction: CashEntryDto['direction']): string {
    return cashEntrySign(direction);
  }

  /** Tone class applied to the amount cell based on entry direction. */
  protected movementAmountClass(entry: CashEntryDto): string {
    return `cash-detail__amount--${cashEntryAmountModifier(entry.direction)}`;
  }

  /** The form is disabled when the session is closed. */
  protected get isClosed(): boolean {
    return this.session()?.status === 'CLOSED';
  }

  /** True when there are entries to display in the table. */
  protected get hasMovements(): boolean {
    return this.entries().length > 0;
  }

  protected goBack(): void {
    void this.router.navigate(['/admin/cash']);
  }

  /** Formats a numeric value as ARS currency (es-AR locale), no decimals. */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
