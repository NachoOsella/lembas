import type { OnDestroy, OnInit } from '@angular/core';
import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';

import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppBadge } from '@shared/components/app-badge/app-badge';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppToast } from '@shared/components/app-toast/app-toast';
import type { ExportData } from '@shared/components/data-export/data-export';
import { DataExport } from '@shared/components/data-export/data-export';
import { parseReportId } from '@features/reports/domain/report-filters';
import { cashDetailExport } from '@features/reports/domain/report-export';
import { paymentMethodLabel } from '@features/reports/public-api';
import { ReportRequestState } from '@features/reports/public-api';
import { DashboardChart } from '@features/dashboard/public-api';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';

import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '@core/pipes/short-date-ar.pipe';
import { ErrorMappingService } from '@core/services/error-mapping';
import { CashReportService } from '@features/cash/data-access/cash-report';
import type { CashReportDto } from '@features/cash/domain/cash-report';
import type { CashSessionStatus } from '@features/cash/domain/cash-session';

/** Cash session detail report (S4-US05). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cash-session-detail-report',
  imports: [
    AppPageHeader,
    AppButton,
    AppBadge,
    AppDataTable,
    AppToast,
    DataExport,
    DashboardChart,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    CurrencyArPipe,
    ShortDateArPipe,
    NgClass,
  ],
  templateUrl: './cash-session-detail.html',
  styleUrl: './cash-session-detail.css',
})
export class CashSessionDetailReportPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cashReportService = inject(CashReportService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly requestState = new ReportRequestState<CashReportDto>();

  /** Page state. */
  public readonly loading = this.requestState.loading;
  public readonly errorMessage = this.requestState.errorMessage;
  public readonly report = this.requestState.data;

  /** Computed chart data for the payment-method breakdown. */
  protected readonly methodLabels = computed(() => {
    const data = this.report();
    if (!data) {
      return [];
    }
    return Object.entries(data.totalsByMethod?.paymentsByMethod ?? {}).map(([key]) =>
      this.methodLabel(key),
    );
  });

  protected readonly methodAmounts = computed(() => {
    const data = this.report();
    if (!data) {
      return [];
    }
    return Object.values(data.totalsByMethod?.paymentsByMethod ?? {}).map((v) => Number(v));
  });

  protected readonly manualMovements = computed(() => this.report()?.manualMovements ?? []);

  protected readonly entries = computed(() => this.report()?.entries ?? []);

  /** Table columns for the manual movements. */
  protected readonly movementColumns: ColumnDef[] = [
    { field: 'type', header: 'Tipo', sortable: false, width: '90px' },
    { field: 'method', header: 'Metodo', sortable: false, width: '110px' },
    { field: 'amount', header: 'Monto', sortable: false, width: '140px' },
    { field: 'reason', header: 'Motivo', sortable: false },
    { field: 'createdByUserName', header: 'Operador', sortable: false, width: '180px' },
    { field: 'createdAt', header: 'Hora', sortable: false, width: '170px' },
  ];

  ngOnInit(): void {
    const id = parseReportId(this.route.snapshot.paramMap.get('sessionId'));
    if (!id) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de sesion invalido.');
      return;
    }
    this.load(id);
  }

  ngOnDestroy(): void {
    this.requestState.destroy();
  }

  protected goBack(): void {
    void this.router.navigate(['/admin/cash/history']);
  }

  protected onRefresh(): void {
    const id = parseReportId(this.route.snapshot.paramMap.get('sessionId'));
    if (id) {
      this.load(id);
    }
  }

  public statusLabel(status: CashSessionStatus): string {
    return status === 'OPEN' ? 'Sesion abierta' : 'Sesion cerrada';
  }

  public statusTone(status: CashSessionStatus): 'success' | 'neutral' {
    return status === 'OPEN' ? 'success' : 'neutral';
  }

  public statusIcon(status: CashSessionStatus): string {
    return status === 'OPEN' ? 'pi pi-check-circle' : 'pi pi-lock';
  }

  /** Returns a CSS class for the cash difference cell. */
  public differenceClass(value: string | null | undefined): string {
    if (!value) {
      return 'cash-detail__cell--neutral';
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) {
      return 'cash-detail__cell--neutral';
    }
    return num > 0 ? 'cash-detail__cell--positive' : 'cash-detail__cell--negative';
  }

  /** True when the difference is a non-negative number (or zero). */
  protected isDifferenceNonNegative(value: string | null | undefined): boolean {
    if (!value) {
      return true;
    }
    const num = Number(value);
    return Number.isFinite(num) && num >= 0;
  }

  /** True when the difference is strictly negative. */
  protected isDifferenceNegative(value: string | null | undefined): boolean {
    if (!value) {
      return false;
    }
    const num = Number(value);
    return Number.isFinite(num) && num < 0;
  }

  /** Builds the CSV export payload for the full session report. */
  public exportData(): ExportData {
    return cashDetailExport(this.report());
  }

  private methodLabel(key: string): string {
    return paymentMethodLabel(key);
  }

  private load(id: number): void {
    this.requestState.load(
      () => this.cashReportService.getCashReport(id),
      this.errorMapping.getMessage('INTERNAL_ERROR'),
    );
  }
}
