import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { Reports } from './reports';

describe('Reports', () => {
  let component: Reports;
  let fixture: ComponentFixture<Reports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Reports);
    component = fixture.componentInstance;
  });

  it('creates the reports hub page', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the five report cards (dashboard, cash, sales, inventory, suppliers)', () => {
    expect(component.cards.length).toBe(5);
    const available = component.cards.filter((c) => c.status === 'available');
    expect(available.length).toBe(5);
    const routes = component.cards.map((c) => c.route);
    expect(routes).toContain('/admin/dashboard');
    expect(routes).toContain('/admin/cash/history');
    expect(routes).toContain('/admin/reports/sales');
    expect(routes).toContain('/admin/reports/inventory');
    expect(routes).toContain('/admin/reports/suppliers');
  });

  it('does not expose recommendations as a report card', () => {
    const routes = component.cards.map((c) => c.route);
    expect(routes).not.toContain('/admin/recommendations');
  });
});
