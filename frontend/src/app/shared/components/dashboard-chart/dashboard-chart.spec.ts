import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardChart } from './dashboard-chart';

/** Component tests for the PrimeNG chart wrapper. */
describe('DashboardChart', () => {
  let component: DashboardChart;
  let fixture: ComponentFixture<DashboardChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardChart],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardChart);
    component = fixture.componentInstance;
  });

  it('renders the loading skeleton while loading', () => {
    fixture.componentRef.setInput('labels', []);
    fixture.componentRef.setInput('data', []);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
  });

  it('renders the empty state when there is no data', () => {
    fixture.componentRef.setInput('labels', []);
    fixture.componentRef.setInput('data', []);
    fixture.componentRef.setInput('empty', true);
    fixture.detectChanges();
    expect(component.empty()).toBe(true);
  });

  it('builds bar chart data with correct labels and datasets', () => {
    fixture.componentRef.setInput('type', 'bar');
    fixture.componentRef.setInput('labels', ['10', '11', '12']);
    fixture.componentRef.setInput('data', [50, 100, 25]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', false);
    fixture.detectChanges();
    const chartData = component.chartData();
    expect(chartData).toBeTruthy();
    expect(chartData.labels).toEqual(['10h', '11h', '12h']);
    expect(chartData.datasets.length).toBe(1);
    expect(chartData.datasets[0].data).toEqual([50, 100, 25]);
  });

  it('builds doughnut chart data with correct slices', () => {
    fixture.componentRef.setInput('type', 'doughnut');
    fixture.componentRef.setInput('labels', ['Efectivo', 'QR']);
    fixture.componentRef.setInput('data', [70, 30]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', false);
    fixture.detectChanges();
    const chartData = component.chartData();
    expect(chartData).toBeTruthy();
    expect(chartData.labels).toEqual(['Efectivo', 'QR']);
    expect(chartData.datasets[0].data).toEqual([70, 30]);
  });

  it('computes legend items with correct percentages', () => {
    fixture.componentRef.setInput('type', 'doughnut');
    fixture.componentRef.setInput('labels', ['Efectivo', 'QR', 'Tarjeta']);
    fixture.componentRef.setInput('data', [50, 30, 20]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', false);
    fixture.detectChanges();
    const legendItems = component.legendItems();
    expect(legendItems.length).toBe(3);
    expect(legendItems[0].percentage).toBe('50.0');
    expect(legendItems[1].percentage).toBe('30.0');
    expect(legendItems[2].percentage).toBe('20.0');
  });

  it('includes secondary dataset when secondaryData is provided', () => {
    fixture.componentRef.setInput('type', 'bar');
    fixture.componentRef.setInput('labels', ['10', '11']);
    fixture.componentRef.setInput('data', [50, 100]);
    fixture.componentRef.setInput('secondaryData', [20, 40]);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', false);
    fixture.detectChanges();
    const chartData = component.chartData();
    expect(chartData.datasets.length).toBe(2);
    expect(chartData.datasets[1].data).toEqual([20, 40]);
  });
});
