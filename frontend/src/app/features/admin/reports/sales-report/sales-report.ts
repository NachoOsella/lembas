import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { AppDatePicker } from '../../../../shared/components/app-date-picker/app-date-picker';
import { AppReportFilterBar } from '../../../../shared/components/app-report-filter-bar/app-report-filter-bar';
import { AppReportSectionHead } from '../../../../shared/components/app-report-section-head/app-report-section-head';
import { DashboardStatCard } from '../../../../shared/components/dashboard-stat-card/dashboard-stat-card';
import { DashboardChart } from '../../../../shared/components/dashboard-chart/dashboard-chart';
import { DataExport, ExportData } from '../../../../shared/components/data-export/data-export';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';

import { ReportsService } from '../../../../core/services/reports';
import { DashboardStatCardDto } from '../../../../shared/models/dashboard';
import {
  ReportBreakdownDto,
  ReportKpiDto,
  ReportSeriesPointDto,
  ReportTopRowDto,
  SalesReportDto,
} from '../../../../shared/models/reports';

/**
 * Sales report (Reportes / Ventas). Surfaces KPI tiles, a daily-sales
 * bar chart, a doughnut for payment methods, a category breakdown bar
 * and a top-products table.
 */
@Component({
  selector: 'app-sales-report',
  imports: [
    AppPageHeader,
    AppButton,
    AppToast,
    AppDatePicker,
    AppReportFilterBar,
    AppReportSectionHead,
    DashboardStatCard,
    DashboardChart,
    DataExport,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
  ],
  templateUrl: './sales-report.html',
  styleUrl: './sales-report.css',
})
export class SalesReportPageComponent implements OnInit {
  private readonly reports = inject(ReportsService);

  protected readonly fromDate = signal<Date | null>(null);
  protected readonly toDate = signal<Date | null>(null);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly data = signal<SalesReportDto | null>(null);

  protected readonly hasData = computed(() => {
    const data = this.data();
    if (!data) {
      return false;
    }
    return (
      data.kpis.length > 0 ||
      data.series.some((p) => p.value > 0) ||
      data.byMethod.length > 0 ||
      data.topProducts.length > 0
    );
  });

  /** Projects the backend KPIs into the shape the stat card expects. */
  protected readonly statCards = computed<DashboardStatCardDto[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return data.kpis.map((kpi: ReportKpiDto) => ({
      label: kpi.label,
      value: kpi.value,
      subtitle: kpi.subtitle ?? null,
      iconName: kpi.iconName,
      colorStyle: kpi.colorStyle,
      trend: kpi.trend ?? null,
      trendPercentage: kpi.trendPercentage ?? null,
    }));
  });

  // -- Chart projections --------------------------------------------------

  protected readonly seriesLabels = computed(() =>
    this.data()?.series.map((p: ReportSeriesPointDto) => p.label) ?? [],
  );
  protected readonly seriesValues = computed(() =>
    this.data()?.series.map((p: ReportSeriesPointDto) => p.value) ?? [],
  );
  protected readonly seriesHasValues = computed(() =>
    this.seriesValues().some((v) => v > 0),
  );

  protected readonly methodLabels = computed(() =>
    this.data()?.byMethod.map((m: ReportBreakdownDto) => m.label) ?? [],
  );
  protected readonly methodAmounts = computed(() =>
    this.data()?.byMethod.map((m: ReportBreakdownDto) => m.amount) ?? [],
  );

  protected readonly categoryLabels = computed(() =>
    this.data()?.byCategory.map((c: ReportBreakdownDto) => c.label) ?? [],
  );
  protected readonly categoryAmounts = computed(() =>
    this.data()?.byCategory.map((c: ReportBreakdownDto) => c.amount) ?? [],
  );

  protected readonly totalRevenue = computed(() => {
    const kpis = this.data()?.kpis ?? [];
    return kpis[0]?.value ?? '$ 0';
  });

  // -- Lifecycle ----------------------------------------------------------

  ngOnInit(): void {
    // Default to the current month.
    const now = new Date();
    this.fromDate.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.toDate.set(now);
    this.load();
  }

  // -- Filter handlers ----------------------------------------------------

  protected onFromChange(date: Date | null): void {
    this.fromDate.set(date);
    this.load();
  }

  protected onToChange(date: Date | null): void {
    this.toDate.set(date);
    this.load();
  }

  protected onClearFilters(): void {
    const now = new Date();
    this.fromDate.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.toDate.set(now);
    this.load();
  }

  protected onRefresh(): void {
    this.load();
  }

  // -- Export -------------------------------------------------------------

  protected exportData(): ExportData {
    const kpis = this.data()?.kpis ?? [];
    return {
      filename: 'reporte_ventas',
      columns: [
        { key: 'kpi', label: 'Indicador' },
        { key: 'value', label: 'Valor' },
        { key: 'subtitle', label: 'Detalle' },
      ],
      rows: kpis.map((kpi: ReportKpiDto) => ({
        kpi: kpi.label,
        value: kpi.value,
        subtitle: kpi.subtitle ?? '',
      })),
    };
  }

  // -- Internals ----------------------------------------------------------

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.reports
      .getSalesReport(toIsoDate(this.fromDate()), toIsoDate(this.toDate()))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
          if (!data) {
            this.errorMessage.set(
              'El reporte de ventas todavia no esta disponible. Intenta nuevamente en unos minutos.',
            );
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar el reporte de ventas.');
          this.loading.set(false);
        },
      });
  }
}

function toIsoDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
