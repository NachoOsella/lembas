import type { OnDestroy, OnInit } from '@angular/core';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';

import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { AppReportFilterBar } from '@features/reports/public-api';
import type { ExportData } from '@shared/components/data-export/data-export';
import { DataExport } from '@shared/components/data-export/data-export';
import { toReportIsoDate } from '@features/reports/domain/report-filters';
import { cashHistoryExport } from '@features/reports/domain/report-export';
import { ReportRequestState } from '@features/reports/public-api';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import { AppBadge } from '@shared/components/app-badge/app-badge';

import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '@core/pipes/short-date-ar.pipe';
import { ErrorMappingService } from '@core/services/error-mapping';
import { CashReportService } from '@features/cash/data-access/cash-report';
import type { CashSessionStatus } from '@features/cash/domain/cash-session';
import type {
  CashSessionHistoryDto,
  CashSessionSummaryDto,
} from '@features/cash/domain/cash-report';

interface StatusFilterOption {
  readonly label: string;
  readonly value: CashSessionStatus | null;
}

/** Cash session history page (S4-US05). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cash-session-history',
  imports: [
    AppPageHeader,
    AppButton,
    AppDataTable,
    AppSelect,
    AppDatePicker,
    AppToast,
    AppReportFilterBar,
    DataExport,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    AppBadge,
    CurrencyArPipe,
    ShortDateArPipe,
    NgClass,
  ],
  templateUrl: './cash-session-history.html',
  styleUrl: './cash-session-history.css',
})
export class CashSessionHistoryPageComponent implements OnInit, OnDestroy {
  private readonly cashReportService = inject(CashReportService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly router = inject(Router);
  private readonly requestState = new ReportRequestState<CashSessionHistoryDto>();

  /** Filter state. */
  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);
  public readonly statusFilter = signal<CashSessionStatus | null>('CLOSED');
  protected readonly page = signal(0);
  protected readonly pageSize = signal(20);

  /** Data state. */
  protected readonly data = this.requestState.data;
  protected readonly loading = this.requestState.loading;
  protected readonly errorMessage = this.requestState.errorMessage;

  /** Status options for the filter dropdown. */
  protected readonly statusOptions: readonly StatusFilterOption[] = [
    { label: 'Todas', value: null },
    { label: 'Abiertas', value: 'OPEN' },
    { label: 'Cerradas', value: 'CLOSED' },
  ];

  /** PrimeNG table columns. */
  public readonly columns: ColumnDef[] = [
    { field: 'openedAt', header: 'Apertura', sortable: true, width: '170px' },
    { field: 'closedAt', header: 'Cierre', sortable: true, width: '170px' },
    { field: 'branchName', header: 'Sucursal', sortable: false },
    { field: 'openedByUserName', header: 'Abrio', sortable: false },
    { field: 'closedByUserName', header: 'Cerro', sortable: false },
    { field: 'expectedCashAmount', header: 'Esperado', sortable: false, width: '120px' },
    { field: 'countedCashAmount', header: 'Contado', sortable: false, width: '120px' },
    { field: 'cashDifferenceAmount', header: 'Diferencia', sortable: false, width: '120px' },
    { field: 'totalPayments', header: 'Pagos', sortable: false, width: '80px' },
    { field: 'actions', header: 'Accion', sortable: false, width: '140px' },
  ];

  protected readonly rows = computed(() => this.data()?.sessions ?? []);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.requestState.destroy();
  }

  protected onStatusChange(value: CashSessionStatus | null): void {
    this.statusFilter.set(value);
    this.page.set(0);
    this.load();
  }

  protected onFromChange(date: Date | null): void {
    this.fromDate.set(date);
    this.page.set(0);
    this.load();
  }

  protected onToChange(date: Date | null): void {
    this.toDate.set(date);
    this.page.set(0);
    this.load();
  }

  protected onRowClick(row: CashSessionSummaryDto): void {
    void this.router.navigate(['/admin/cash/history', row.id]);
  }

  protected onPage(event: { first: number; rows: number }): void {
    this.page.set(Math.floor(event.first / event.rows));
    this.pageSize.set(event.rows);
    this.load();
  }

  protected onRefresh(): void {
    this.requestState.retry();
  }

  protected clearFilters(): void {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.statusFilter.set('CLOSED');
    this.page.set(0);
    this.load();
  }

  /** Builds the CSV export payload for the visible rows. */
  protected exportData(): ExportData {
    return cashHistoryExport(this.rows());
  }

  public differenceClass(value: string | null | undefined): string {
    if (!value) {
      return 'cash-history__cell--neutral';
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) {
      return 'cash-history__cell--neutral';
    }
    return num > 0 ? 'cash-history__cell--positive' : 'cash-history__cell--negative';
  }

  protected statusLabel(status: CashSessionStatus): string {
    return status === 'OPEN' ? 'Abierta' : 'Cerrada';
  }

  protected statusTone(status: CashSessionStatus): 'success' | 'neutral' {
    return status === 'OPEN' ? 'success' : 'neutral';
  }

  private load(): void {
    this.requestState.load(
      () =>
        this.cashReportService.getCashSessionHistory(
          null,
          toReportIsoDate(this.fromDate()),
          toReportIsoDate(this.toDate()),
          null,
          null,
          this.statusFilter(),
          this.page(),
          this.pageSize(),
        ),
      this.errorMapping.getMessage('INTERNAL_ERROR'),
    );
  }
}
