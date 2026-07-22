import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ReportsService } from './reports';

describe('ReportsService', () => {
  let service: ReportsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('forwards only supplied date and branch filters', () => {
    service.getSalesReport('2026-07-01', null, 3).subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/api/admin/reports/sales');
    expect(request.request.params.get('from')).toBe('2026-07-01');
    expect(request.request.params.get('to')).toBeNull();
    expect(request.request.params.get('branchId')).toBe('3');
    request.flush({});
  });

  it('converts a missing optional report endpoint to null', () => {
    let result: unknown = 'pending';
    service.getInventoryReport().subscribe((response) => (result = response));

    const request = http.expectOne((candidate) => candidate.url === '/api/admin/reports/inventory');
    request.flush(null, new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));

    expect(result).toBeNull();
  });

  it('does not hide non-404 failures behind the optional response', () => {
    const failure = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
    let received: unknown = null;

    service.getSuppliersReport().subscribe({ error: (error: unknown) => (received = error) });
    const request = http.expectOne('/api/admin/reports/suppliers');
    request.flush(null, failure);

    expect(received).toBeInstanceOf(HttpErrorResponse);
    if (received instanceof HttpErrorResponse) {
      expect(received.status).toBe(500);
    }
  });

  it('does not convert a successful empty response into an error', () => {
    let result: unknown = null;
    service.getEmployeeReport().subscribe((response) => (result = response));

    const request = http.expectOne((candidate) => candidate.url === '/api/admin/reports/employees');
    request.flush(null);

    expect(result).toBeNull();
  });
});
