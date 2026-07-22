import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CashDetailPageStore } from '../state/cash-detail-page.store';
import type { CashEntryDto, CashSessionStatus } from '@features/cash/domain/cash-session';
import { calculatePhysicalCash, formatCashAmount } from '@features/cash/public-api';
import { AppBadge } from '@shared/components/app-badge/app-badge';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppModal } from '@shared/components/app-modal/app-modal';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSectionCard } from '@shared/components/app-section-card/app-section-card';
import type { AppMetricItem } from '@shared/components/app-stat-card/app-stat-card';
import { AppStatCard } from '@shared/components/app-stat-card/app-stat-card';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import { MovementForm } from '../movement-form/movement-form';
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

interface SessionBadgeConfig {
  readonly label: string;
  readonly tone: 'success' | 'neutral';
  readonly icon: string;
}

const SESSION_STATUS_BADGES: Record<CashSessionStatus, SessionBadgeConfig> = {
  OPEN: { label: 'Sesion abierta', tone: 'success', icon: 'pi pi-check-circle' },
  CLOSED: { label: 'Sesion cerrada', tone: 'neutral', icon: 'pi pi-lock' },
};

/** Cash detail page with a physical-cash summary and unified entry timeline. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  providers: [CashDetailPageStore],
  templateUrl: './cash-detail.html',
  styleUrl: './cash-detail.css',
})
export class CashDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly store = inject(CashDetailPageStore);

  protected readonly loading = this.store.loading;
  protected readonly errorMessage = this.store.errorMessage;
  protected readonly session = this.store.session;
  protected readonly entries = this.store.entries;
  protected readonly statusBadges = SESSION_STATUS_BADGES;
  protected readonly movementDialogVisible = signal(false);

  protected readonly totalIn = computed(() =>
    this.entries()
      .filter((entry) => entry.direction === 'IN')
      .reduce((sum, entry) => sum + Math.abs(Number(entry.amount)), 0),
  );
  protected readonly totalOut = computed(() =>
    this.entries()
      .filter((entry) => entry.direction === 'OUT')
      .reduce((sum, entry) => sum + Math.abs(Number(entry.amount)), 0),
  );
  protected readonly totalAdjustments = computed(() =>
    this.entries()
      .filter((entry) => entry.direction === 'NEUTRAL')
      .reduce((sum, entry) => sum + Number(entry.amount), 0),
  );
  protected readonly totalMovements = computed(
    () => this.totalIn() - this.totalOut() + this.totalAdjustments(),
  );
  protected readonly cashInDrawer = computed(() =>
    calculatePhysicalCash(this.session(), this.entries()),
  );
  protected readonly cashMovementsCount = computed(
    () => this.entries().filter((entry) => entry.method === 'CASH').length,
  );
  protected readonly movementsCount = computed(() => this.entries().length);

  protected readonly summaryMetrics = computed<readonly AppMetricItem[]>(() => [
    {
      label: 'Apertura',
      value: formatCashAmount(Number(this.session()?.openingCashAmount ?? 0)),
      detail: 'Fondo inicial de la sesion',
      icon: 'pi pi-flag',
      tone: 'forest',
    },
    {
      label: 'Ingresos',
      value: formatCashAmount(this.totalIn()),
      detail: this.totalIn() > 0 ? 'Actividad registrada en la sesion' : 'Sin ingresos registrados',
      icon: 'pi pi-arrow-down',
      tone: 'sage',
      trend: this.totalIn() > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Egresos',
      value: formatCashAmount(this.totalOut()),
      detail: this.totalOut() > 0 ? 'Actividad de salida registrada' : 'Sin egresos registrados',
      icon: 'pi pi-arrow-up',
      tone: 'amber',
      trend: this.totalOut() > 0 ? 'down' : 'neutral',
    },
    {
      label: 'Total movimientos',
      value: formatCashAmount(this.totalMovements()),
      detail:
        this.movementsCount() > 0
          ? `Neto de toda la actividad (${this.movementsCount()})`
          : 'Sin movimientos registrados',
      icon: 'pi pi-chart-line',
      tone: 'forest',
    },
    {
      label: 'Efectivo en caja',
      value: formatCashAmount(this.cashInDrawer()),
      detail:
        this.cashMovementsCount() > 0
          ? `Solo efectivo fisico (${this.cashMovementsCount()} entradas)`
          : 'Solo el fondo inicial, en billetes',
      icon: 'pi pi-money-bill',
      tone: 'sage',
    },
  ]);

  protected readonly entriesColumns = CASH_ENTRY_COLUMNS;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.store.setInvalidRouteError('Identificador de caja invalido.');
      return;
    }
    this.store.load(id);
  }

  protected retry(): void {
    this.store.refresh();
  }

  protected onMovementAdded(): void {
    this.movementDialogVisible.set(false);
    this.store.refresh();
  }

  protected openMovementDialog(): void {
    if (!this.isClosed) {
      this.movementDialogVisible.set(true);
    }
  }

  protected closeMovementDialog(): void {
    this.movementDialogVisible.set(false);
  }

  protected goToClose(): void {
    const id = this.session()?.id;
    if (id !== undefined) {
      void this.router.navigate(['/admin/cash/close', id]);
    }
  }

  protected movementTone(entry: CashEntryDto) {
    return cashEntryTypeTone(entry);
  }

  protected movementLabel(entry: CashEntryDto): string {
    return cashEntryLabel(entry);
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

  protected movementSign(direction: CashEntryDto['direction']): string {
    return cashEntrySign(direction);
  }

  protected movementAmountClass(entry: CashEntryDto): string {
    return `cash-detail__amount--${cashEntryAmountModifier(entry.direction)}`;
  }

  protected get isClosed(): boolean {
    return this.session()?.status === 'CLOSED';
  }

  protected get hasMovements(): boolean {
    return this.entries().length > 0;
  }

  protected goBack(): void {
    void this.router.navigate(['/admin/cash']);
  }
}
