import type { CashOverviewDto, CashSessionSummaryDto } from '@features/cash/domain/cash-report';
import type { RecommendationDto } from './recommendation';
import type { EmployeePerformanceDto, SalesReportDto, SuppliersReportDto } from './reports';
import {
  cashHistoryExport,
  cashOverviewExport,
  employeesExport,
  inventoryCategoryExport,
  recommendationsExport,
  salesProductsExport,
  salesSeriesExport,
  suppliersLeadTimeExport,
  suppliersPurchasesExport,
  suppliersTopExport,
} from './report-export';

describe('report export adapters', () => {
  it('exports sales series and product rows with controlled fallbacks', () => {
    const report: SalesReportDto = {
      from: '2026-07-01',
      to: '2026-07-18',
      branchId: null,
      branchName: null,
      generatedAt: '2026-07-18T12:00:00Z',
      kpis: [],
      series: [{ date: '2026-07-18', label: '18 Jul', value: 1250 }],
      byMethod: [],
      byCategory: [],
      topProducts: [
        {
          id: 1,
          primary: 'Granola',
          secondary: null,
          metric: '$ 1.250',
          submetric: null,
        },
      ],
    };

    expect(salesSeriesExport(report).rows).toEqual([
      { date: '2026-07-18', branch: 'Todas', revenue: 1250 },
    ]);
    expect(salesProductsExport(report).rows).toEqual([
      { product: 'Granola', category: 'Sin categoria', revenue: '$ 1.250', quantity: '' },
    ]);
  });

  it('keeps inventory and supplier export schemas aligned with their tables', () => {
    const inventory = inventoryCategoryExport({
      branchId: 2,
      branchName: 'Centro',
      generatedAt: '2026-07-18T12:00:00Z',
      kpis: [],
      stockByCategory: [
        { key: 'CEREALS', label: 'Cereales', amount: 500, count: 10, percentage: 100 },
      ],
      expiringByMonth: [],
      topByValue: [],
      lowStock: [],
    });
    const suppliers: SuppliersReportDto = {
      from: '2026-07-01',
      to: '2026-07-18',
      branchId: null,
      branchName: null,
      generatedAt: '2026-07-18T12:00:00Z',
      kpis: [],
      purchasesByMonth: [],
      topByVolume: [{ id: 1, primary: 'Proveedor A', metric: '$ 500', submetric: '2' }],
      leadTimeBySupplier: [
        { id: 1, primary: 'Proveedor A', secondary: 'Cereales', metric: '3 dias', submetric: '2' },
      ],
    };

    expect(inventory.rows[0]).toEqual({
      branch: 'Centro',
      category: 'Cereales',
      value: 500,
      units: 10,
      percentage: 100,
    });
    expect(suppliersTopExport(suppliers).rows[0]).toEqual({
      primary: 'Proveedor A',
      amount: '$ 500',
      receipts: '2',
    });
    expect(suppliersLeadTimeExport(suppliers).columns.map((column) => column.key)).toEqual([
      'primary',
      'secondary',
      'metric',
      'submetric',
    ]);
  });

  it('exports employee, recommendation, and cash rows', () => {
    const employee: EmployeePerformanceDto = {
      employeeId: 7,
      employeeName: 'Carla',
      role: 'EMPLOYEE',
      posSalesCount: 3,
      posRevenue: 900,
      averageTicket: 300,
      cashSessionsOpened: 1,
      cashSessionsClosed: 1,
      cashDifferenceAbsolute: 0,
    };
    const recommendation: RecommendationDto = {
      id: 'LOW_STOCK-1',
      type: 'LOW_STOCK',
      title: 'Stock bajo',
      description: 'Reponer granola',
      urgency: 'HIGH',
      iconName: 'pi pi-exclamation-triangle',
      link: '/admin/inventory',
      actionLabel: 'Reponer',
      productId: 1,
      productName: 'Granola',
      categoryId: null,
      categoryName: null,
      barcode: null,
      currentStock: 2,
      minimumStock: 5,
      generatedAt: '2026-07-18T12:00:00Z',
    };
    const cashOverview: CashOverviewDto = {
      from: '2026-07-01',
      to: '2026-07-18',
      branchId: null,
      branchName: null,
      generatedAt: '2026-07-18T12:00:00Z',
      closedSessions: 1,
      openSessions: 0,
      balancedSessions: 1,
      sessionsWithDifference: 0,
      expectedCashTotal: 100,
      countedCashTotal: 100,
      netDifferenceTotal: 0,
      absoluteDifferenceTotal: 0,
      dailyCloseSeries: [
        {
          date: '2026-07-18',
          closedSessions: 1,
          expectedCash: 100,
          countedCash: 100,
          difference: 0,
        },
      ],
      paymentMethods: [],
      sessionsWithDiscrepancy: [],
    };

    expect(employeesExport([employee]).rows[0]).toMatchObject({
      employee: 'Carla',
      role: 'Empleado',
    });
    expect(recommendationsExport([recommendation]).rows[0]).toMatchObject({
      type: 'Stock bajo',
      context: 'Stock: 2 / minimo: 5',
    });
    expect(cashOverviewExport(cashOverview).rows).toHaveLength(1);
  });

  it('formats visible cash history rows and handles missing optional reports', () => {
    const session: CashSessionSummaryDto = {
      id: 7,
      branchId: 1,
      branchName: 'Centro',
      openedByUserName: 'Ana',
      closedByUserName: null,
      openedAt: '2026-07-18T10:00:00Z',
      closedAt: null,
      openingCashAmount: '100.00',
      expectedCashAmount: null,
      countedCashAmount: null,
      cashDifferenceAmount: null,
      cashDifferenceReason: null,
      status: 'OPEN',
      totalPayments: 2,
      totalManualMovements: 0,
    };

    expect(cashHistoryExport([session]).rows[0]).toMatchObject({
      branchName: 'Centro',
      closedByUserName: '—',
      expectedCashAmount: '—',
    });
    expect(salesSeriesExport(null).rows).toEqual([]);
    expect(suppliersPurchasesExport(null).rows).toEqual([]);
  });
});
