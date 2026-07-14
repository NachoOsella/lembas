import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { RecommendationService } from './recommendation';
import { RecommendationDto } from '../../shared/models/recommendation';

/** Unit tests for the recommendations HTTP service. */
describe('RecommendationService', () => {
  let service: RecommendationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecommendationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hits the bare recommendations endpoint', () => {
    const stub: RecommendationDto[] = [];

    service.getRecommendations().subscribe((response) => {
      expect(response).toEqual(stub);
    });

    const req = httpMock.expectOne('/api/admin/recommendations');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(stub);
  });

  it('forwards type, urgency and limit filters', () => {
    const stub: RecommendationDto[] = [];

    service
      .getRecommendations(2, 'HIGH', 'LOW_STOCK', 10, 5)
      .subscribe((response) => {
        expect(response).toEqual(stub);
      });

    const req = httpMock.expectOne(
      (r) => r.url === '/api/admin/recommendations',
    );
    const params = req.request.params;
    expect(params.get('branchId')).toBe('2');
    expect(params.get('minUrgency')).toBe('HIGH');
    expect(params.get('type')).toBe('LOW_STOCK');
    expect(params.get('productId')).toBe('10');
    expect(params.get('limit')).toBe('5');
    req.flush(stub);
  });

  it('caps the dashboard panel at 5 items', () => {
    service.getDashboardPanel().subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/admin/recommendations',
    );
    expect(req.request.params.get('limit')).toBe('5');
    req.flush([]);
  });
});
