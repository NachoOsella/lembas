import type { ExportData } from '@shared/components/data-export/data-export';
import type {
  CashOverviewDto,
  CashReportDto,
  CashSessionSummaryDto,
} from '@features/cash/domain/cash-report';

import type {
  EmployeePerformanceDto,
  InventoryReportDto,
  SalesReportDto,
  SuppliersReportDto,
} from './reports';
import type { RecommendationDto } from './recommendation';
import {
  employeeRoleLabel,
  recommendationContext,
  recommendationTypeLabel,
  recommendationUrgencyLabel,
} from './report-presentation';

export function salesSeriesExport(report: SalesReportDto | null): ExportData {
  return {
    filename: 'reporte_ventas_diarias',
    columns: [
      { key: 'date', label: 'Fecha' },
      { key: 'branch', label: 'Sucursal' },
      { key: 'revenue', label: 'Facturacion' },
    ],
    rows: (report?.series ?? []).map((point) => ({
      date: point.date,
      branch: report?.branchName ?? 'Todas',
      revenue: point.value,
    })),
  };
}

export function salesProductsExport(report: SalesReportDto | null): ExportData {
  return {
    filename: 'reporte_ventas_productos',
    columns: [
      { key: 'product', label: 'Producto' },
      { key: 'category', label: 'Categoria historica' },
      { key: 'revenue', label: 'Facturacion neta' },
      { key: 'quantity', label: 'Cantidad' },
    ],
    rows: (report?.topProducts ?? []).map((row) => ({
      product: row.primary,
      category: row.secondary ?? 'Sin categoria',
      revenue: row.metric,
      quantity: row.submetric ?? '',
    })),
  };
}

export function inventoryCategoryExport(report: InventoryReportDto | null): ExportData {
  return {
    filename: 'reporte_inventario_categorias',
    columns: [
      { key: 'branch', label: 'Sucursal' },
      { key: 'category', label: 'Categoria' },
      { key: 'value', label: 'Stock valorizado' },
      { key: 'units', label: 'Unidades' },
      { key: 'percentage', label: 'Participacion (%)' },
    ],
    rows: (report?.stockByCategory ?? []).map((category) => ({
      branch: report?.branchName ?? 'Todas',
      category: category.label,
      value: category.amount,
      units: category.count,
      percentage: category.percentage,
    })),
  };
}

export function inventoryTopValueExport(report: InventoryReportDto | null): ExportData {
  return {
    filename: 'inventario_top_valor',
    columns: [
      { key: 'primary', label: 'Producto' },
      { key: 'secondary', label: 'Categoria' },
      { key: 'metric', label: 'Valor' },
      { key: 'submetric', label: 'Stock' },
    ],
    rows: (report?.topByValue ?? []).map((row) => ({
      primary: row.primary,
      secondary: row.secondary ?? '',
      metric: row.metric,
      submetric: row.submetric ?? '',
    })),
  };
}

export function suppliersPurchasesExport(report: SuppliersReportDto | null): ExportData {
  return {
    filename: 'reporte_proveedores_recepciones',
    columns: [
      { key: 'month', label: 'Mes' },
      { key: 'branch', label: 'Sucursal' },
      { key: 'amount', label: 'Costo recibido' },
      { key: 'receipts', label: 'Recepciones' },
    ],
    rows: (report?.purchasesByMonth ?? []).map((point) => ({
      month: point.date,
      branch: report?.branchName ?? 'Todas',
      amount: point.value,
      receipts: point.secondaryValue ?? 0,
    })),
  };
}

export function suppliersTopExport(report: SuppliersReportDto | null): ExportData {
  return topRowsExport('proveedores_por_volumen', report?.topByVolume ?? [], 'Proveedor');
}

export function suppliersLeadTimeExport(report: SuppliersReportDto | null): ExportData {
  return {
    filename: 'proveedores_lead_time',
    columns: [
      { key: 'primary', label: 'Proveedor' },
      { key: 'secondary', label: 'Categoria' },
      { key: 'metric', label: 'Lead time' },
      { key: 'submetric', label: 'Ordenes' },
    ],
    rows: (report?.leadTimeBySupplier ?? []).map((row) => ({
      primary: row.primary,
      secondary: row.secondary ?? '',
      metric: row.metric,
      submetric: row.submetric ?? '',
    })),
  };
}

export function employeesExport(rows: ReadonlyArray<EmployeePerformanceDto>): ExportData {
  return {
    filename: 'reporte_operativo_empleados',
    columns: [
      { key: 'employee', label: 'Operador' },
      { key: 'role', label: 'Rol' },
      { key: 'posSales', label: 'Ventas POS' },
      { key: 'posRevenue', label: 'Facturacion POS' },
      { key: 'averageTicket', label: 'Ticket promedio' },
      { key: 'opened', label: 'Aperturas de caja' },
      { key: 'closed', label: 'Cierres de caja' },
      { key: 'difference', label: 'Desvios absolutos' },
    ],
    rows: rows.map((row) => ({
      employee: row.employeeName,
      role: employeeRoleLabel(row.role),
      posSales: row.posSalesCount,
      posRevenue: row.posRevenue,
      averageTicket: row.averageTicket,
      opened: row.cashSessionsOpened,
      closed: row.cashSessionsClosed,
      difference: row.cashDifferenceAbsolute,
    })),
  };
}

export function recommendationsExport(
  recommendations: ReadonlyArray<RecommendationDto>,
): ExportData {
  return {
    filename: 'recomendaciones',
    columns: [
      { key: 'type', label: 'Tipo' },
      { key: 'urgency', label: 'Urgencia' },
      { key: 'productName', label: 'Producto' },
      { key: 'description', label: 'Detalle' },
      { key: 'context', label: 'Datos' },
      { key: 'actionLabel', label: 'Accion' },
    ],
    rows: recommendations.map((recommendation) => ({
      type: recommendationTypeLabel(recommendation.type),
      urgency: recommendationUrgencyLabel(recommendation.urgency),
      productName: recommendation.productName,
      description: recommendation.description,
      context: recommendationContext(recommendation),
      actionLabel: recommendation.actionLabel,
    })),
  };
}

export function cashOverviewExport(report: CashOverviewDto | null): ExportData {
  return {
    filename: 'resumen_caja',
    columns: [
      { key: 'date', label: 'Fecha' },
      { key: 'closedSessions', label: 'Cierres' },
      { key: 'expectedCash', label: 'Efectivo esperado' },
      { key: 'countedCash', label: 'Efectivo contado' },
      { key: 'difference', label: 'Diferencia' },
    ],
    rows: (report?.dailyCloseSeries ?? []).map((point) => ({
      date: point.date,
      closedSessions: point.closedSessions,
      expectedCash: point.expectedCash,
      countedCash: point.countedCash,
      difference: point.difference,
    })),
  };
}

export function cashHistoryExport(rows: ReadonlyArray<CashSessionSummaryDto>): ExportData {
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
    rows: rows.map((row) => ({
      openedAt: formatDateTime(row.openedAt),
      closedAt: formatDateTime(row.closedAt),
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

export function cashDetailExport(report: CashReportDto | null): ExportData {
  if (!report) {
    return { filename: 'reporte_cierre_caja', columns: [], rows: [] };
  }

  return {
    filename: `reporte_cierre_caja_${report.sessionId}`,
    columns: [
      { key: 'label', label: 'Concepto' },
      { key: 'value', label: 'Valor' },
    ],
    rows: [
      { label: 'Sucursal', value: report.branchName },
      { label: 'Abrio', value: report.openedByUserName ?? '—' },
      { label: 'Apertura', value: formatDateTime(report.openedAt) },
      { label: 'Cerro', value: report.closedByUserName ?? '—' },
      { label: 'Cierre', value: formatDateTime(report.closedAt) },
      { label: 'Estado', value: report.status === 'OPEN' ? 'Sesion abierta' : 'Sesion cerrada' },
      { label: 'Monto apertura', value: report.openingCashAmount },
      { label: 'Esperado', value: report.expectedCashAmount ?? '—' },
      { label: 'Contado', value: report.countedCashAmount ?? '—' },
      { label: 'Diferencia', value: report.cashDifferenceAmount ?? '—' },
      { label: 'Motivo diferencia', value: report.cashDifferenceReason ?? '—' },
      { label: 'Transacciones', value: String(report.totalTransactions) },
      { label: 'Pedidos POS', value: String(report.posOrdersCount) },
      { label: 'Total POS', value: report.totalPosRevenue },
    ],
  };
}

function topRowsExport(
  filename: string,
  rows: ReadonlyArray<{
    readonly primary: string;
    readonly metric: string;
    readonly submetric?: string | null;
  }>,
  primaryLabel: string,
): ExportData {
  return {
    filename,
    columns: [
      { key: 'primary', label: primaryLabel },
      { key: 'amount', label: 'Costo recibido' },
      { key: 'receipts', label: 'Recepciones' },
    ],
    rows: rows.map((row) => ({
      primary: row.primary,
      amount: row.metric,
      receipts: row.submetric ?? '',
    })),
  };
}

function formatDateTime(value: string | null): string {
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
