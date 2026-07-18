import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DashboardStatCard } from './dashboard-stat-card';
import type { DashboardStatCardDto } from '@features/dashboard/domain/dashboard';

describe('DashboardStatCard', () => {
  let component: DashboardStatCard;
  let fixture: ComponentFixture<DashboardStatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardStatCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardStatCard);
    component = fixture.componentInstance;
  });

  it('renders the value and label when data is provided', () => {
    const card: DashboardStatCardDto = {
      label: 'Ventas del dia',
      value: '$ 45.230',
      iconName: 'pi pi-shopping-cart',
      colorStyle: 'SUCCESS',
      trend: 'UP',
      trendPercentage: 12.5,
    };
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ventas del dia');
    expect(el.textContent).toContain('$ 45.230');
  });

  it('shows the loading skeleton while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('card', {
      label: 'x',
      value: '0',
      iconName: 'pi pi-x',
      colorStyle: 'NEUTRAL',
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-card--loading')).toBeTruthy();
  });

  it('formats the trend percentage with a sign', () => {
    const card: DashboardStatCardDto = {
      label: 'Pendientes',
      value: '5',
      iconName: 'pi pi-clock',
      colorStyle: 'WARNING',
      trend: 'DOWN',
      trendPercentage: -8.3,
    };
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
    expect(component.trendValue()).toBe('-8.3%');
  });
});
