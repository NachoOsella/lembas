import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { SalesReportPageComponent } from './sales-report';

describe('SalesReportPageComponent', () => {
  let component: SalesReportPageComponent;
  let fixture: ComponentFixture<SalesReportPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesReportPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesReportPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the sales report page', () => {
    expect(component).toBeTruthy();
  });

  it('initialises the from-date to the first day of the current month', () => {
    const from = component['fromDate']();
    expect(from).toBeTruthy();
    if (from) {
      expect(from.getDate()).toBe(1);
    }
  });

  it('initialises the to-date to today', () => {
    const to = component['toDate']();
    const today = new Date();
    expect(to).toBeTruthy();
    if (to) {
      expect(to.getFullYear()).toBe(today.getFullYear());
      expect(to.getMonth()).toBe(today.getMonth());
      expect(to.getDate()).toBe(today.getDate());
    }
  });
});
