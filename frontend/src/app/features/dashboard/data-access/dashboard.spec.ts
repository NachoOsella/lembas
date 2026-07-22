import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { DashboardService } from './dashboard';
import type { DashboardDto } from '@features/dashboard/domain/dashboard';

/** Unit tests for the dashboard HTTP service. */
describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hits the dashboard endpoint without query params when called bare', () => {
    const stub: Partial<DashboardDto> = { reportDate: '2026-07-13' };

    service.getDashboard().subscribe((response) => {
      expect(response).toEqual(stub);
    });

    const req = httpMock.expectOne('/api/admin/reports/dashboard');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(stub);
  });

  it('forwards the date and branchId filters when provided', () => {
    const stub: Partial<DashboardDto> = { reportDate: '2026-07-12' };

    service.getDashboard('2026-07-12', 3).subscribe((response) => {
      expect(response).toEqual(stub);
    });

    const req = httpMock.expectOne((r) => r.url === '/api/admin/reports/dashboard');
    expect(req.request.params.get('date')).toBe('2026-07-12');
    expect(req.request.params.get('branchId')).toBe('3');
    req.flush(stub);
  });
});
