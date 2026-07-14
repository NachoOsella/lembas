/**
 * Shared DTOs for the new admin report endpoints (Ventas, Inventario,
 * Proveedores). Shapes mirror the backend Spring records returned by
 * {@code GET /api/admin/reports/sales|inventory|suppliers}.
 */

/** One KPI tile on the new report pages. */
export interface ReportKpiDto {
  readonly label: string;
  readonly value: string;
  readonly subtitle?: string | null;
  readonly iconName: string;
  readonly colorStyle: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO' | 'NEUTRAL';
  readonly trend?: 'UP' | 'DOWN' | 'FLAT' | null;
  readonly trendPercentage?: number | null;
}

/** One slice of a "by X" chart (sales by category, inventory by category, etc.). */
export interface ReportBreakdownDto {
  readonly key: string;
  readonly label: string;
  readonly amount: number;
  readonly count: number;
  readonly percentage: number;
}

/** One row of a daily/weekly/monthly series used by the report bar charts. */
export interface ReportSeriesPointDto {
  /** ISO date string yyyy-MM-dd. */
  readonly date: string;
  readonly label: string;
  readonly value: number;
  readonly secondaryValue?: number | null;
}

/** Top-N rows (top products, top suppliers, low stock list) attached to a report. */
export interface ReportTopRowDto {
  readonly id: number | string;
  readonly primary: string;
  readonly secondary?: string | null;
  readonly metric: string;
  readonly submetric?: string | null;
  readonly badge?: string | null;
}

/** Full payload returned by the sales report endpoint. */
export interface SalesReportDto {
  readonly from: string;
  readonly to: string;
  readonly branchId: number | null;
  readonly branchName: string | null;
  readonly generatedAt: string;
  readonly kpis: ReadonlyArray<ReportKpiDto>;
  readonly series: ReadonlyArray<ReportSeriesPointDto>;
  readonly byMethod: ReadonlyArray<ReportBreakdownDto>;
  readonly byCategory: ReadonlyArray<ReportBreakdownDto>;
  readonly topProducts: ReadonlyArray<ReportTopRowDto>;
}

/** Full payload returned by the inventory report endpoint. */
export interface InventoryReportDto {
  readonly branchId: number | null;
  readonly branchName: string | null;
  readonly generatedAt: string;
  readonly kpis: ReadonlyArray<ReportKpiDto>;
  readonly stockByCategory: ReadonlyArray<ReportBreakdownDto>;
  readonly expiringByMonth: ReadonlyArray<ReportSeriesPointDto>;
  readonly topByValue: ReadonlyArray<ReportTopRowDto>;
  readonly lowStock: ReadonlyArray<ReportTopRowDto>;
}

/** Full payload returned by the suppliers report endpoint. */
export interface SuppliersReportDto {
  readonly from: string;
  readonly to: string;
  readonly generatedAt: string;
  readonly kpis: ReadonlyArray<ReportKpiDto>;
  readonly purchasesByMonth: ReadonlyArray<ReportSeriesPointDto>;
  readonly topByVolume: ReadonlyArray<ReportTopRowDto>;
  readonly leadTimeBySupplier: ReadonlyArray<ReportTopRowDto>;
}
