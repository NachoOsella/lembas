import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CashReportService } from './cash-report';
import { CashSessionHistoryDto, CashReportDto } from '../../shared/models/cash-report';

/** Unit tests for the cash report HTTP service. */
describe('CashReportService', () => {
  let service: CashReportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CashReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hits the history endpoint with the default filters', () => {
    const stub: CashSessionHistoryDto = {
      sessions: [],
      totalCount: 0,
      page: 0,
      size: 20,
    };

    service.getCashSessionHistory().subscribe((response) => {
      expect(response).toEqual(stub);
    });

    const req = httpMock.expectOne(
      (r) => r.url === '/api/admin/reports/cash-sessions',
    );
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('openedAt,desc');
    req.flush(stub);
  });

  it('forwards every filter when provided', () => {
    const stub: CashSessionHistoryDto = {
      sessions: [],
      totalCount: 0,
      page: 1,
      size: 10,
    };

    service
      .getCashSessionHistory(2, '2026-07-01', '2026-07-13', 5, 6, 'CLOSED', 1, 10)
      .subscribe((response) => {
        expect(response).toEqual(stub);
      });

    const req = httpMock.expectOne(
      (r) => r.url === '/api/admin/reports/cash-sessions',
    );
    const params = req.request.params;
    expect(params.get('branchId')).toBe('2');
    expect(params.get('from')).toBe('2026-07-01');
    expect(params.get('to')).toBe('2026-07-13');
    expect(params.get('openedBy')).toBe('5');
    expect(params.get('closedBy')).toBe('6');
    expect(params.get('status')).toBe('CLOSED');
    req.flush(stub);
  });

  it('hits the cash-session detail endpoint', () => {
    const stub: Partial<CashReportDto> = { sessionId: 7, totalTransactions: 0 };

    service.getCashReport(7).subscribe((response) => {
      expect(response).toEqual(stub);
    });

    const req = httpMock.expectOne('/api/admin/reports/cash-session/7');
    expect(req.request.method).toBe('GET');
    req.flush(stub);
  });
});
