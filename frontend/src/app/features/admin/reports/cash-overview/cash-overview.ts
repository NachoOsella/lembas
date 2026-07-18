import type { OnInit } from '@angular/core';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppButton } from '@shared/components/app-button/app-button';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';
import { AppDataTable } from '@shared/components/app-data-table/app-data-table';
import { AppDatePicker } from '@shared/components/app-date-picker/app-date-picker';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppReportFilterBar } from '@features/reports/ui/app-report-filter-bar/app-report-filter-bar';
import { AppReportGrid } from '@features/reports/ui/app-report-grid/app-report-grid';
import { AppReportPanel } from '@features/reports/ui/app-report-panel/app-report-panel';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { DashboardChart } from '@features/dashboard/ui/dashboard-chart/dashboard-chart';
import { DashboardStatCard } from '@features/dashboard/ui/dashboard-stat-card/dashboard-stat-card';
import type { ExportData } from '@shared/components/data-export/data-export';
import { DataExport } from '@shared/components/data-export/data-export';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';

import { CurrencyArPipe } from '@core/pipes/currency-ar.pipe';
import { ShortDateArPipe } from '@core/pipes/short-date-ar.pipe';
import { CashReportService } from '@features/cash/data-access/cash-report';
import { UserService } from '@features/users/data-access/user';
import type { DashboardStatCardDto } from '@features/dashboard/domain/dashboard';
import type { CashMethodTotalDto, CashOverviewDto } from '@features/cash/domain/cash-report';
import type { Branch } from '@features/users/domain/user';

/** Operational overview for cash closes, separate from the session history. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cash-overview',
  imports: [
    AppButton,
    AppDataTable,
    AppDatePicker,
    AppPageHeader,
    AppReportFilterBar,
    AppReportGrid,
    AppReportPanel,
    AppSelect,
    AppToast,
    DashboardChart,
    DashboardStatCard,
    DataExport,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    CurrencyArPipe,
    ShortDateArPipe,
    RouterLink,
  ],
  templateUrl: './cash-overview.html',
  styleUrl: './cash-overview.css',
})
export class CashOverviewPageComponent implements OnInit {
  private readonly cashReports = inject(CashReportService);
  private readonly userService = inject(UserService);

  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);
  protected readonly branchId = signal<number | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly data = signal<CashOverviewDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly branchOptions = computed(() =>
    this.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );
  protected readonly metricCards = computed<DashboardStatCardDto[]>(() => {
    const report = this.data();
    if (!report) return [];
    return [
      {
        label: 'Cierres realizados',
        value: formatNumber(report.closedSessions),
        subtitle: `${formatNumber(report.openSessions)} sesiones abiertas en el periodo`,
        iconName: 'pi pi-wallet',
        colorStyle: 'INFO',
      },
      {
        label: 'Cierres sin diferencia',
        value: formatNumber(report.balancedSessions),
        subtitle: 'Arqueos que coincidieron con el efectivo esperado',
        iconName: 'pi pi-check-circle',
        colorStyle: 'SUCCESS',
      },
      {
        label: 'Cierres con diferencia',
        value: formatNumber(report.sessionsWithDifference),
        subtitle: 'Requieren seguimiento del responsable',
        iconName: 'pi pi-exclamation-triangle',
        colorStyle: report.sessionsWithDifference > 0 ? 'WARNING' : 'NEUTRAL',
      },
      {
        label: 'Desvio acumulado',
        value: formatCurrency(report.absoluteDifferenceTotal),
        subtitle: 'Sumatoria absoluta de sobrantes y faltantes',
        iconName: 'pi pi-chart-line',
        colorStyle: report.absoluteDifferenceTotal > 0 ? 'WARNING' : 'NEUTRAL',
      },
    ];
  });
  protected readonly dailyLabels = computed(
    () => this.data()?.dailyCloseSeries.map((point) => formatShortDate(point.date)) ?? [],
  );
  protected readonly dailyExpected = computed(
    () => this.data()?.dailyCloseSeries.map((point) => Number(point.expectedCash)) ?? [],
  );
  protected readonly dailyCounted = computed(
    () => this.data()?.dailyCloseSeries.map((point) => Number(point.countedCash)) ?? [],
  );
  protected readonly paymentLabels = computed(
    () => this.data()?.paymentMethods.map((method) => paymentMethodLabel(method.method)) ?? [],
  );
  protected readonly paymentAmounts = computed(
    () => this.data()?.paymentMethods.map((method) => Number(method.amount)) ?? [],
  );
  protected readonly hasPaymentData = computed(() =>
    this.paymentAmounts().some((amount) => amount > 0),
  );
  protected readonly discrepancies = computed(() => [
    ...(this.data()?.sessionsWithDiscrepancy ?? []),
  ]);

  protected readonly discrepancyColumns: ColumnDef[] = [
    { field: 'closedAt', header: 'Cierre', width: '150px' },
    { field: 'branchName', header: 'Sucursal' },
    { field: 'closedByUserName', header: 'Cerro' },
    { field: 'expectedCashAmount', header: 'Esperado', width: '130px' },
    { field: 'countedCashAmount', header: 'Contado', width: '130px' },
    { field: 'cashDifferenceAmount', header: 'Diferencia', width: '130px' },
    { field: 'cashDifferenceReason', header: 'Motivo' },
  ];

  ngOnInit(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    this.fromDate.set(from);
    this.toDate.set(today);
    this.userService.listBranches().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
    this.load();
  }

  protected onFromChange(date: Date | null): void {
    this.fromDate.set(date);
    this.load();
  }

  protected onToChange(date: Date | null): void {
    this.toDate.set(date);
    this.load();
  }

  protected onBranchChange(branchId: number | null): void {
    this.branchId.set(branchId);
    this.load();
  }

  protected resetFilters(): void {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    this.fromDate.set(from);
    this.toDate.set(today);
    this.branchId.set(null);
    this.load();
  }

  protected exportData(): ExportData {
    const data = this.data();
    if (!data) {
      return { filename: 'resumen_caja', columns: [], rows: [] };
    }
    return {
      filename: 'resumen_caja',
      columns: [
        { key: 'date', label: 'Fecha' },
        { key: 'closedSessions', label: 'Cierres' },
        { key: 'expectedCash', label: 'Efectivo esperado' },
        { key: 'countedCash', label: 'Efectivo contado' },
        { key: 'difference', label: 'Diferencia' },
      ],
      rows: data.dailyCloseSeries.map((point) => ({
        date: point.date,
        closedSessions: point.closedSessions,
        expectedCash: point.expectedCash,
        countedCash: point.countedCash,
        difference: point.difference,
      })),
    };
  }

  protected paymentMethodLabel(method: CashMethodTotalDto['method']): string {
    return paymentMethodLabel(method);
  }

  protected differenceClass(value: string | number | null): string {
    const difference = Number(value ?? 0);
    if (difference === 0) return 'cash-overview__difference--balanced';
    return difference > 0
      ? 'cash-overview__difference--positive'
      : 'cash-overview__difference--negative';
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cashReports
      .getCashOverview(toIsoDate(this.fromDate()), toIsoDate(this.toDate()), this.branchId())
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar el resumen de caja. Intenta nuevamente.');
          this.loading.set(false);
        },
      });
  }
}

function toIsoDate(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatShortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function paymentMethodLabel(method: string): string {
  return (
    {
      CASH: 'Efectivo',
      QR: 'QR',
      TRANSFER: 'Transferencia',
      DEBIT_CARD: 'Debito',
      CREDIT_CARD: 'Credito',
      CHECKOUT_PRO: 'Mercado Pago',
      OTHER: 'Otros',
    }[method] ?? method
  );
}
