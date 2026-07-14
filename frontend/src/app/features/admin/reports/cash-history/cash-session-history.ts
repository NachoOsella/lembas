import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';

import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import {
  AppDataTable,
  ColumnDef,
} from '../../../../shared/components/app-data-table/app-data-table';
import { AppSelect } from '../../../../shared/components/app-select/app-select';
import { AppDatePicker } from '../../../../shared/components/app-date-picker/app-date-picker';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { AppReportFilterBar } from '../../../../shared/components/app-report-filter-bar/app-report-filter-bar';
import { DataExport, ExportData } from '../../../../shared/components/data-export/data-export';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { AppBadge } from '../../../../shared/components/app-badge/app-badge';

import { CurrencyArPipe } from '../../../../core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '../../../../core/pipes/short-date-ar.pipe';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { CashReportService } from '../../../../core/services/cash-report';
import { CashSessionStatus } from '../../../../shared/models/cash-session';
import {
  CashSessionHistoryDto,
  CashSessionSummaryDto,
} from '../../../../shared/models/cash-report';

interface StatusFilterOption {
  readonly label: string;
  readonly value: CashSessionStatus | null;
}

/** Cash session history page (S4-US05). */
@Component({
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
export class CashSessionHistoryPageComponent implements OnInit {
  private readonly cashReportService = inject(CashReportService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly router = inject(Router);

  /** Filter state. */
  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);
  public readonly statusFilter = signal<CashSessionStatus | null>('CLOSED');
  protected readonly page = signal(0);
  protected readonly pageSize = signal(20);

  /** Data state. */
  protected readonly data = signal<CashSessionHistoryDto | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Status options for the filter dropdown. */
  protected readonly statusOptions: readonly StatusFilterOption[] = [
    { label: 'Todas', value: null },
    { label: 'Abiertas', value: 'OPEN' as CashSessionStatus },
    { label: 'Cerradas', value: 'CLOSED' as CashSessionStatus },
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

  protected clearFilters(): void {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.statusFilter.set('CLOSED');
    this.page.set(0);
    this.load();
  }

  /** Builds the CSV export payload for the visible rows. */
  protected exportData(): ExportData {
    return {
      filename: 'historial_cierres_caja',
      columns: [
        { key: 'openedAt', label: 'Apertura' },
        { key: 'closedAt', label: 'Cierre' },
        { key: 'branchName', label: 'Sucursal' },
        { key: 'openedByUserName', label: 'Abrio' },
        { key: 'closedByUserName', label: 'Cerro' },
        { key: 'openingCashAmount', label: 'Apertura $' },
        { key: 'expectedCashAmount', label: 'Esperado' },
        { key: 'countedCashAmount', label: 'Contado' },
        { key: 'cashDifferenceAmount', label: 'Diferencia' },
        { key: 'cashDifferenceReason', label: 'Motivo' },
        { key: 'status', label: 'Estado' },
        { key: 'totalPayments', label: 'Pagos' },
        { key: 'totalManualMovements', label: 'Movimientos' },
      ],
      rows: this.rows().map((row) => ({
        openedAt: this.formatDateTime(row.openedAt),
        closedAt: this.formatDateTime(row.closedAt),
        branchName: row.branchName,
        openedByUserName: row.openedByUserName,
        closedByUserName: row.closedByUserName ?? '—',
        openingCashAmount: row.openingCashAmount,
        expectedCashAmount: row.expectedCashAmount ?? '—',
        countedCashAmount: row.countedCashAmount ?? '—',
        cashDifferenceAmount: row.cashDifferenceAmount ?? '—',
        cashDifferenceReason: row.cashDifferenceReason ?? '',
        status: row.status,
        totalPayments: row.totalPayments,
        totalManualMovements: row.totalManualMovements,
      })),
    };
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

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cashReportService
      .getCashSessionHistory(
        null,
        this.toIsoDate(this.fromDate()),
        this.toIsoDate(this.toDate()),
        null,
        null,
        this.statusFilter(),
        this.page(),
        this.pageSize(),
      )
      .subscribe({
        next: (response) => {
          this.data.set(response);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.extractMessage(err));
        },
      });
  }

  private toIsoDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object') {
      const candidate = err as { error?: { message?: string } | null; message?: string };
      if (candidate.error && typeof candidate.error === 'object' && candidate.error.message) {
        return this.errorMapping.getMessage('INTERNAL_ERROR', candidate.error.message);
      }
      if (typeof candidate.message === 'string') {
        return this.errorMapping.getMessage('INTERNAL_ERROR', candidate.message);
      }
    }
    return this.errorMapping.getMessage('INTERNAL_ERROR');
  }
}
