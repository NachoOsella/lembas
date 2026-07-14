import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';

import { RecommendationDto } from '../../../../shared/models/recommendation';
import { RecommendationsPanelComponent } from './recommendations-panel';

describe('RecommendationsPanelComponent', () => {
  let component: RecommendationsPanelComponent;
  let fixture: ComponentFixture<RecommendationsPanelComponent>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendationsPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(RecommendationsPanelComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads recommendations automatically when the page opens', () => {
    fixture.detectChanges();

    const request = httpTesting.expectOne('/api/admin/recommendations');
    expect(request.request.method).toBe('GET');
    request.flush([createRecommendation()]);

    expect(component.recommendations()).toHaveLength(1);
    expect(component.loading()).toBe(false);
  });

  it('exposes the generic filter options and table columns', () => {
    expect(component.typeOptions).toHaveLength(5);
    expect(component.urgencyOptions).toHaveLength(4);
    expect(component.columns).toHaveLength(6);
  });

  it('reloads with the selected type filter', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/recommendations').flush([]);

    component['onTypeChange']('LOW_STOCK');

    const request = httpTesting.expectOne(
      (candidate) =>
        candidate.url === '/api/admin/recommendations' &&
        candidate.params.get('type') === 'LOW_STOCK',
    );
    request.flush([]);
  });

  it('formats rule-specific context for the table', () => {
    expect(component['context'](createRecommendation({ currentStock: 2, minimumStock: 5 }))).toBe(
      'Stock: 2 / minimo: 5',
    );
  });
});

function createRecommendation(overrides: Partial<RecommendationDto> = {}): RecommendationDto {
  return {
    id: 'LOW_STOCK-1',
    type: 'LOW_STOCK',
    title: 'Stock bajo: Granola',
    description: 'El stock se encuentra por debajo del minimo.',
    urgency: 'HIGH',
    iconName: 'pi pi-exclamation-triangle',
    link: '/admin/inventory/product/1/lots',
    actionLabel: 'Reponer',
    productId: 1,
    productName: 'Granola',
    categoryId: 1,
    categoryName: 'Cereales',
    barcode: null,
    generatedAt: '2026-07-14T10:00:00Z',
    ...overrides,
  };
}
