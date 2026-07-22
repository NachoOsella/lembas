import type { DashboardStatCardDto } from '@features/dashboard/domain/dashboard';

import type {
  EmployeePerformanceDto,
  ReportBreakdownDto,
  ReportKpiDto,
  ReportSeriesPointDto,
} from './reports';
import type {
  RecommendationDto,
  RecommendationType,
  RecommendationUrgency,
} from './recommendation';

export interface ReportChartData {
  readonly labels: string[];
  readonly values: number[];
}

export function mapReportKpis(kpis: ReadonlyArray<ReportKpiDto>): DashboardStatCardDto[] {
  return kpis.map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
    subtitle: kpi.subtitle ?? null,
    iconName: kpi.iconName,
    colorStyle: kpi.colorStyle,
    trend: kpi.trend ?? null,
    trendPercentage: kpi.trendPercentage ?? null,
  }));
}

export function mapSeriesChart(points: ReadonlyArray<ReportSeriesPointDto>): ReportChartData {
  return {
    labels: points.map((point) => point.label),
    values: points.map((point) => point.value),
  };
}

export function mapBreakdownChart(items: ReadonlyArray<ReportBreakdownDto>): ReportChartData {
  return {
    labels: items.map((item) => item.label),
    values: items.map((item) => item.amount),
  };
}

export function mapEmployeeRevenueChart(
  rows: ReadonlyArray<EmployeePerformanceDto>,
): ReportChartData {
  return {
    labels: rows.map((row) => row.employeeName),
    values: rows.map((row) => row.posRevenue),
  };
}

export function hasPositiveValue(values: ReadonlyArray<number>): boolean {
  return values.some((value) => value > 0);
}

export type RecommendationBadgeTone = 'danger' | 'warning' | 'info';

const recommendationTypeLabels: Record<RecommendationType, string> = {
  LOW_STOCK: 'Stock bajo',
  EXPIRING_SOON: 'Lotes por vencer',
  HIGH_ROTATION: 'Alta rotacion',
  NO_MOVEMENT: 'Sin movimiento',
};

const recommendationUrgencyLabels: Record<RecommendationUrgency, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

const recommendationUrgencyTones: Record<RecommendationUrgency, RecommendationBadgeTone> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
};

export function recommendationTypeLabel(type: RecommendationType): string {
  return recommendationTypeLabels[type];
}

export function recommendationUrgencyLabel(urgency: RecommendationUrgency): string {
  return recommendationUrgencyLabels[urgency];
}

export function recommendationUrgencyTone(urgency: RecommendationUrgency): RecommendationBadgeTone {
  return recommendationUrgencyTones[urgency];
}

export function recommendationContext(recommendation: RecommendationDto): string {
  if (recommendation.currentStock != null && recommendation.minimumStock != null) {
    return `Stock: ${recommendation.currentStock} / minimo: ${recommendation.minimumStock}`;
  }
  if (recommendation.expirationDate) {
    return `Vence: ${new Intl.DateTimeFormat('es-AR').format(new Date(recommendation.expirationDate))}`;
  }
  if (recommendation.last7DaysSales != null) {
    return `Ventas ultimos 7 dias: ${recommendation.last7DaysSales}`;
  }
  if (recommendation.daysWithoutSales != null) {
    return `Sin ventas: ${recommendation.daysWithoutSales} dias`;
  }
  return 'Sin datos adicionales';
}

export function employeeRoleLabel(role: string): string {
  return { ADMIN: 'Administrador', MANAGER: 'Gerente', EMPLOYEE: 'Empleado' }[role] ?? role;
}

export function paymentMethodLabel(method: string): string {
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
