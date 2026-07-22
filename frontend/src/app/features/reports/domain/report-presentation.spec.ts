import {
  employeeRoleLabel,
  hasPositiveValue,
  mapBreakdownChart,
  mapEmployeeRevenueChart,
  mapReportKpis,
  mapSeriesChart,
  paymentMethodLabel,
  recommendationContext,
  recommendationTypeLabel,
  recommendationUrgencyLabel,
  recommendationUrgencyTone,
} from './report-presentation';
import type { RecommendationDto } from './recommendation';

describe('report presentation adapters', () => {
  it('maps KPIs while preserving optional presentation values', () => {
    const cards = mapReportKpis([
      {
        label: 'Ventas',
        value: '$ 1.000',
        iconName: 'pi pi-chart-line',
        colorStyle: 'SUCCESS',
        subtitle: undefined,
        trend: 'UP',
        trendPercentage: 12,
      },
    ]);

    expect(cards).toEqual([
      {
        label: 'Ventas',
        value: '$ 1.000',
        iconName: 'pi pi-chart-line',
        colorStyle: 'SUCCESS',
        subtitle: null,
        trend: 'UP',
        trendPercentage: 12,
      },
    ]);
  });

  it('maps series, breakdowns, and employee revenue to chart inputs', () => {
    expect(
      mapSeriesChart([{ date: '2026-07-18', label: '18 Jul', value: 1250, secondaryValue: 4 }]),
    ).toEqual({ labels: ['18 Jul'], values: [1250] });
    expect(
      mapBreakdownChart([
        { key: 'CASH', label: 'Efectivo', amount: 900, count: 3, percentage: 75 },
      ]),
    ).toEqual({ labels: ['Efectivo'], values: [900] });
    expect(
      mapEmployeeRevenueChart([
        {
          employeeId: 7,
          employeeName: 'Carla',
          role: 'EMPLOYEE',
          posSalesCount: 3,
          posRevenue: 900,
          averageTicket: 300,
          cashSessionsOpened: 1,
          cashSessionsClosed: 1,
          cashDifferenceAbsolute: 0,
        },
      ]),
    ).toEqual({ labels: ['Carla'], values: [900] });
  });

  it('detects positive chart values without treating zero as data', () => {
    expect(hasPositiveValue([0, 0])).toBe(false);
    expect(hasPositiveValue([0, 1])).toBe(true);
  });

  it('maps recommendation and payment labels to controlled copy', () => {
    expect(recommendationTypeLabel('LOW_STOCK')).toBe('Stock bajo');
    expect(recommendationUrgencyLabel('HIGH')).toBe('Alta');
    expect(recommendationUrgencyTone('HIGH')).toBe('danger');
    expect(employeeRoleLabel('MANAGER')).toBe('Gerente');
    expect(employeeRoleLabel('OTHER')).toBe('OTHER');
    expect(paymentMethodLabel('CASH')).toBe('Efectivo');
  });

  it('selects the most specific recommendation context', () => {
    const recommendation: RecommendationDto = {
      id: 'LOW_STOCK-1',
      type: 'LOW_STOCK',
      title: 'Stock bajo',
      description: 'Reponer',
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
      last7DaysSales: 8,
      generatedAt: '2026-07-18T12:00:00Z',
    };

    expect(recommendationContext(recommendation)).toBe('Stock: 2 / minimo: 5');
    expect(
      recommendationContext({ ...recommendation, currentStock: null, minimumStock: null }),
    ).toBe('Ventas ultimos 7 dias: 8');
  });
});
