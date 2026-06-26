import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';

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
import {
  SeverityPill,
  SeverityPillTone,
} from '../../../../shared/components/severity-pill/severity-pill';

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
  private readonly messageService = inject(MessageService);
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

  /** Expected cash in drawer = opening + in - out + adjustments. */
  protected readonly expectedCash = computed(() => {
    const opening = Number(this.session()?.openingCashAmount ?? 0);
    return opening + this.totalIn() - this.totalOut() + this.totalAdjustments();
  });

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
      label: 'Esperado en caja',
      value: this.formatCurrency(this.expectedCash()),
      detail: 'Apertura + ingresos - egresos',
      icon: 'pi pi-wallet',
      tone: 'forest',
    },
  ]);

  /** Data-table column definition for the unified entries list. */
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

  /** Closes the movement dialog without saving. */
  protected closeMovementDialog(): void {
    this.movementDialogVisible.set(false);
  }

  /** Tone for the entry type pill (CASH_IN green, CASH_OUT red, ADJUSTMENT amber). */
  protected movementTone(entry: CashEntryDto): SeverityPillTone {
    if (entry.kind === 'PAYMENT') {
      return 'neutral';
    }
    switch (entry.type) {
      case 'CASH_IN':
        return 'success';
      case 'CASH_OUT':
        return 'danger';
      case 'ADJUSTMENT':
        return 'warn';
      default:
        return 'neutral';
    }
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

  /** Tone for the kind pill (Manual = success, Caja = warn). */
  protected kindTone(kind: CashEntryDto['kind']): SeverityPillTone {
    return kind === 'PAYMENT' ? 'warn' : 'success';
  }

  /** Localized label for the entry method (manual or payment). */
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

  /** Sign prefix to display in the amount cell. */
  protected movementSign(direction: CashEntryDto['direction']): string {
    if (direction === 'IN') return '+';
    if (direction === 'OUT') return '-';
    return '±';
  }

  /** Tone class applied to the amount cell based on entry direction. */
  protected movementAmountClass(entry: CashEntryDto): string {
    if (entry.direction === 'IN') return 'cash-detail__amount--in';
    if (entry.direction === 'OUT') return 'cash-detail__amount--out';
    return 'cash-detail__amount--adjust';
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

  /** Formats a numeric value as ARS currency (es-AR locale). */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
