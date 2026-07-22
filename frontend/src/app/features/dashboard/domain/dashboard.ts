/**
 * DTOs matching the backend {@code com.dietetica.lembas.reports.dto.DashboardDto}
 * and its nested types (S4-US04).
 *
 * <p>Numeric values are pre-formatted server-side as localised strings (AR
 * currency, es-AR thousands separator) so the FE can render them as-is. The
 * only place the FE applies its own formatting is for the
 * {@link TrendPercentage}, which is a signed number with two decimals.</p>
 */

/**
 * Trend direction for {@link DashboardStatCardDto}.
 * - {@code UP}: current value is greater than the previous period
 * - {@code DOWN}: current value is smaller than the previous period
 * - {@code FLAT}: no change (or no previous data)
 */
export type DashboardTrend = 'UP' | 'DOWN' | 'FLAT';

/**
 * Semantic color style for the stat card. Maps to Lembas design tokens
 * via the dashboard stat card component.
 */
export type DashboardStatColor = 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO' | 'NEUTRAL';

/** Single metric card on the operational dashboard. */
export interface DashboardStatCardDto {
  label: string;
  value: string;
  subtitle?: string | null;
  trend?: DashboardTrend | null;
  trendPercentage?: number | null;
  iconName: string;
  colorStyle: DashboardStatColor;
  link?: string | null;
  tooltip?: string | null;
}

/** One row of the "top products" table. */
export interface TopProductDto {
  position: number;
  productId: number;
  productName: string;
  barcode: string | null;
  categoryId: number | null;
  categoryName: string | null;
  brandName: string | null;
  quantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  imageUrl: string | null;
}

/** One bucket of the "sales by hour" chart. */
export interface SalesByHourDto {
  hour: number;
  orderCount: number;
  totalRevenue: number;
  onlineOrders: number;
  posOrders: number;
}

/** One slice of the "payment method distribution" doughnut chart. */
export interface SalesByMethodDto {
  method: string;
  methodLabel: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

/** Full operational dashboard payload returned by the backend. */
export interface DashboardDto {
  reportDate: string;
  branchId: number | null;
  branchName: string | null;
  generatedAt: string;
  todaySales: DashboardStatCardDto;
  onlineSales: DashboardStatCardDto;
  posSales: DashboardStatCardDto;
  pendingOrders: DashboardStatCardDto;
  lowStockProducts: DashboardStatCardDto;
  expiringLots: DashboardStatCardDto;
  todayTransactions: DashboardStatCardDto;
  avgOrderValue: DashboardStatCardDto;
  totalProducts: DashboardStatCardDto;
  totalSuppliers: DashboardStatCardDto;
  topProducts: TopProductDto[];
  salesByHour: SalesByHourDto[];
  salesByMethod: SalesByMethodDto[];
  salesTrendPercentage: number | null;
  transactionsTrendPercentage: number | null;
  avgOrderTrendPercentage: number | null;
}
