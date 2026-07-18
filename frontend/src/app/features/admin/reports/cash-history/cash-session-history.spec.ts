import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CashSessionHistoryPageComponent } from './cash-session-history';

describe('CashSessionHistoryPageComponent', () => {
  let component: CashSessionHistoryPageComponent;
  let fixture: ComponentFixture<CashSessionHistoryPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashSessionHistoryPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashSessionHistoryPageComponent);
    component = fixture.componentInstance;
  });

  it('creates the page', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the default status filter (CLOSED)', () => {
    expect(component.statusFilter()).toBe('CLOSED');
  });

  it('exposes the column definitions in display order', () => {
    expect(component.columns[0].field).toBe('openedAt');
    expect(component.columns[component.columns.length - 1].field).toBe('actions');
  });

  it('maps a positive difference to the success color class', () => {
    expect(component.differenceClass('100.00')).toBe('cash-history__cell--positive');
  });

  it('maps a negative difference to the danger color class', () => {
    expect(component.differenceClass('-50.00')).toBe('cash-history__cell--negative');
  });

  it('maps zero to the neutral class', () => {
    expect(component.differenceClass('0')).toBe('cash-history__cell--neutral');
    expect(component.differenceClass(null)).toBe('cash-history__cell--neutral');
  });
});
