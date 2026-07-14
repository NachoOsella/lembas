import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CashOverviewPageComponent } from './cash-overview';

describe('CashOverviewPageComponent', () => {
  let component: CashOverviewPageComponent;
  let fixture: ComponentFixture<CashOverviewPageComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashOverviewPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CashOverviewPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the cash overview for the initial 30-day range', () => {
    const branchesRequest = http.expectOne('/api/admin/branches');
    branchesRequest.flush([]);
    const reportRequest = http.expectOne(
      (request) => request.url === '/api/admin/reports/cash-overview',
    );
    expect(reportRequest.request.params.get('from')).toBeTruthy();
    expect(reportRequest.request.params.get('to')).toBeTruthy();
    reportRequest.flush({
      from: '2026-06-15',
      to: '2026-07-14',
      branchId: null,
      branchName: null,
      generatedAt: '2026-07-14T12:00:00Z',
      closedSessions: 0,
      openSessions: 0,
      balancedSessions: 0,
      sessionsWithDifference: 0,
      expectedCashTotal: 0,
      countedCashTotal: 0,
      netDifferenceTotal: 0,
      absoluteDifferenceTotal: 0,
      dailyCloseSeries: [],
      paymentMethods: [],
      sessionsWithDiscrepancy: [],
    });
    expect(component).toBeTruthy();
  });
});
